/* ==========================================================
   Clash Arena — Firebase Authentication helpers
   Mobile number + password ko Firebase Auth (email/password)
   par map karta hai. Password Firebase ke paas secure rehta hai.
   ========================================================== */
(function () {
    "use strict";

    var AUTH_DOMAIN = "clasharena.app";
    var auth = null;

    try {
        if (typeof firebase !== "undefined" && FIREBASE_CONFIGURED) {
            auth = firebase.auth();
        }
    } catch (e) {
        auth = null;
    }

    function normalizeMobile(value) {
        var digits = String(value == null ? "" : value).replace(/\D/g, "");
        if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
        if (digits.length === 11 && digits.charAt(0) === "0") digits = digits.slice(1);
        return digits;
    }

    function isValidMobile(mobile) {
        return /^[6-9]\d{9}$/.test(mobile);
    }

    function mobileToEmail(mobile) {
        return "m" + mobile + "@" + AUTH_DOMAIN;
    }

    function passwordProblem(password) {
        if (!password || password.length < 8) return "Password kam se kam 8 characters ka hona chahiye.";
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password me letter aur number dono hone chahiye.";
        return "";
    }

    function makeError(code, message, needsSetup) {
        var err = new Error(message);
        err.code = code;
        if (needsSetup) err.needsSetup = true;
        return err;
    }

    function friendlyAuthError(err) {
        var code = (err && err.code) || "";
        if (code === "auth/operation-not-allowed" || code === "auth/admin-restricted-operation") {
            return makeError(code, "Firebase Console me Email/Password sign-in enable nahi hai. Authentication → Sign-in method → Email/Password enable karo.", true);
        }
        if (code === "auth/email-already-in-use") {
            return makeError(code, "Ye mobile number pehle se registered hai. Login karo.");
        }
        if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-login-credentials") {
            return makeError(code, "Mobile number ya password galat hai.");
        }
        if (code === "auth/too-many-requests") {
            return makeError(code, "Bahut zyada attempts ho gaye. Thodi der baad try karo.");
        }
        if (code === "auth/network-request-failed") {
            return makeError(code, "Internet connection check karo aur phir try karo.");
        }
        if (code === "auth/weak-password") {
            return makeError(code, "Password kamzor hai. Kam se kam 8 characters, letter aur number use karo.");
        }
        if (code === "auth/requires-recent-login") {
            return makeError(code, "Security ke liye dobara login karo, phir password change karo.");
        }
        if (code === "auth/invalid-email") {
            return makeError(code, "Mobile number valid nahi hai.");
        }
        return makeError(code || "auth/unknown", (err && err.message) ? err.message : "Kuch galat ho gaya. Dobara try karo.");
    }

    function withTimeout(promise, ms) {
        return new Promise(function (resolve, reject) {
            var done = false;
            var timer = setTimeout(function () {
                if (!done) { done = true; reject(makeError("timeout", "Request timeout. Internet check karke retry karo.")); }
            }, ms);
            promise.then(function (value) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(value);
            }, function (err) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    function ensureReady() {
        if (!FIREBASE_CONFIGURED || !db) {
            throw makeError("setup/missing-config", "Firebase configured nahi hai. firebase-config.js check karo.");
        }
        if (!auth) {
            throw makeError("setup/missing-auth", "Firebase Auth load nahi hua. Page reload karo.");
        }
    }

    function codeFromUid(uid) {
        return ("CA" + String(uid || "").replace(/[^a-z0-9]/gi, "").slice(0, 6)).toUpperCase();
    }

    async function findReferrer(code) {
        var snap = await withTimeout(
            db.collection("users").where("referralCode", "==", code).limit(1).get(),
            8000
        );
        if (snap.empty) return null;
        return snap.docs[0];
    }

    async function register(data) {
        ensureReady();
        var userName = String(data.userName || "").trim();
        var mobile = normalizeMobile(data.mobile);
        var password = String(data.password || "");
        var referral = String(data.referralCode || "").trim().toUpperCase();

        if (userName.length < 3) throw makeError("form/name", "User name kam se kam 3 characters ka hona chahiye.");
        if (userName.length > 40) throw makeError("form/name", "User name 40 characters se chhota rakho.");
        if (!isValidMobile(mobile)) throw makeError("form/mobile", "10 digit valid mobile number daalo.");
        var pwProblem = passwordProblem(password);
        if (pwProblem) throw makeError("form/password", pwProblem);

        var referrer = null;
        if (referral) {
            try {
                referrer = await findReferrer(referral);
            } catch (e) {
                throw makeError("referral/check-failed", "Referral code verify nahi ho paya. Dobara try karo.");
            }
            if (!referrer) throw makeError("referral/invalid", "Referral code galat hai. Optional field khaali chhod sakte ho.");
        }

        var cred;
        try {
            cred = await auth.createUserWithEmailAndPassword(mobileToEmail(mobile), password);
        } catch (e) {
            throw friendlyAuthError(e);
        }

        var user = cred.user;

        try {
            await user.updateProfile({ displayName: userName });
            await db.collection("users").doc(user.uid).set({
                userName: userName,
                mobile: mobile,
                referralCode: codeFromUid(user.uid),
                referredBy: referrer ? referrer.id : "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                wallet: {
                    balance: 0,
                    totalEarnings: 0,
                    totalDeposits: 0,
                    totalWithdrawals: 0
                }
            });
        } catch (e) {
            try { await user.delete(); } catch (ignore) { }
            try { await auth.signOut(); } catch (ignore2) { }
            throw makeError("register/profile-failed", "Account save nahi ho paya. Thodi der baad try karo.");
        }

        return user;
    }

    async function login(mobileValue, passwordValue) {
        ensureReady();
        var mobile = normalizeMobile(mobileValue);
        var password = String(passwordValue || "");

        if (!isValidMobile(mobile)) throw makeError("form/mobile", "10 digit valid mobile number daalo.");
        if (!password) throw makeError("form/password", "Password daalo.");

        try {
            var cred = await auth.signInWithEmailAndPassword(mobileToEmail(mobile), password);
            return cred.user;
        } catch (e) {
            throw friendlyAuthError(e);
        }
    }

    async function loadProfile(uid) {
        if (!db) return null;
        try {
            var snap = await withTimeout(db.collection("users").doc(uid).get(), 8000);
            if (!snap.exists) return null;
            var data = snap.data();
            data.uid = uid;
            return data;
        } catch (e) {
            return null;
        }
    }

    function requireUser(loginPath) {
        loginPath = loginPath || "../";
        return new Promise(function (resolve) {
            if (!auth) {
                window.location.replace(loginPath);
                return;
            }
            var unsub = auth.onAuthStateChanged(function (user) {
                if (!user) {
                    try { unsub(); } catch (e) { }
                    window.location.replace(loginPath);
                    return;
                }
                try { unsub(); } catch (e) { }
                resolve(user);
            }, function () {
                window.location.replace(loginPath);
            });
        });
    }

    function redirectIfLoggedIn(path) {
        path = path || "home/";
        if (!auth) return;
        auth.onAuthStateChanged(function (user) {
            if (user) window.location.replace(path);
        });
    }

    async function logout(path) {
        try { if (auth) await auth.signOut(); } catch (e) { }
        window.location.replace(path || "../");
    }

    async function updateUserName(user, userName) {
        var name = String(userName || "").trim();
        if (name.length < 3) throw makeError("form/name", "User name kam se kam 3 characters ka hona chahiye.");
        if (name.length > 40) throw makeError("form/name", "User name 40 characters se chhota rakho.");
        await user.updateProfile({ displayName: name });
        await db.collection("users").doc(user.uid).update({ userName: name });
        return name;
    }

    async function changePassword(user, currentPassword, newPassword) {
        if (!currentPassword) throw makeError("form/current", "Current password daalo.");
        var problem = passwordProblem(newPassword);
        if (problem) throw makeError("form/password", problem);
        if (currentPassword === newPassword) throw makeError("form/password", "Naya password purane se alag rakho.");

        var credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        try {
            await user.reauthenticateWithCredential(credential);
        } catch (e) {
            throw friendlyAuthError(e);
        }
        try {
            await user.updatePassword(newPassword);
        } catch (e) {
            throw friendlyAuthError(e);
        }
    }

    window.CA_AUTH = {
        auth: auth,
        ready: !!auth,
        normalizeMobile: normalizeMobile,
        isValidMobile: isValidMobile,
        mobileToEmail: mobileToEmail,
        passwordProblem: passwordProblem,
        friendlyAuthError: friendlyAuthError,
        register: register,
        login: login,
        loadProfile: loadProfile,
        requireUser: requireUser,
        redirectIfLoggedIn: redirectIfLoggedIn,
        logout: logout,
        updateUserName: updateUserName,
        changePassword: changePassword
    };
})();
