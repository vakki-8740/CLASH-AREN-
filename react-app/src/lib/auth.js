import firebase, { auth, db, FIREBASE_CONFIGURED } from "./firebase";

const AUTH_DOMAIN = "clasharena.app";

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

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value == null ? "" : value).trim());
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

    function randomUserId() {
        var value;
        try {
            if (typeof crypto !== "undefined" && crypto.getRandomValues) {
                var buffer = new Uint32Array(1);
                crypto.getRandomValues(buffer);
                value = buffer[0] % 90000;
            } else {
                value = Math.floor(Math.random() * 90000);
            }
        } catch (e) {
            value = Math.floor(Math.random() * 90000);
        }
        return String(10000 + value);
    }

    async function ensureUserId(profile, uid) {
        if (!profile) return "";
        if (/^\d{5}$/.test(String(profile.userId || ""))) return profile.userId;
        if (!db || !auth || !auth.currentUser || auth.currentUser.uid !== uid) return "";

        var stamp = firebase.firestore.FieldValue.serverTimestamp();
        for (var attempt = 0; attempt < 10; attempt++) {
            var candidate = randomUserId();
            try {
                var result = await db.runTransaction(async function (tx) {
                    var userRef = db.collection("users").doc(uid);
                    var idRef = db.collection("userIds").doc(candidate);
                    var userSnap = await tx.get(userRef);
                    if (!userSnap.exists) return { error: "missing-profile" };

                    var current = userSnap.data() || {};
                    if (/^\d{5}$/.test(String(current.userId || ""))) {
                        return { userId: current.userId };
                    }

                    var idSnap = await tx.get(idRef);
                    if (idSnap.exists) return { collision: true };

                    tx.update(userRef, { userId: candidate });
                    tx.set(idRef, { uid: uid, userId: candidate, createdAt: stamp });
                    return { userId: candidate };
                });

                if (result && result.userId) {
                    profile.userId = result.userId;
                    return result.userId;
                }
                if (result && result.error) return "";
            } catch (e) {
                console.error("User ID setup failed:", e);
                return "";
            }
        }
        return "";
    }

    async function findReferrer(code) {
        var snap = await withTimeout(db.collection("referralCodes").doc(code).get(), 8000);
        if (!snap.exists) return null;
        var data = snap.data() || {};
        if (!data.uid) return null;
        return { uid: data.uid, userName: data.userName || "", code: code };
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
            var code = codeFromUid(user.uid);
            var stamp = firebase.firestore.FieldValue.serverTimestamp();
            await user.updateProfile({ displayName: userName });

            var savedUserId = "";
            var lastError = null;

            for (var attempt = 0; attempt < 10; attempt++) {
                var candidate = randomUserId();
                try {
                    var idCheck = await db.collection("userIds").doc(candidate).get();
                    if (idCheck.exists) continue;
                } catch (ignore) { }
                var batch = db.batch();

                batch.set(db.collection("users").doc(user.uid), {
                    userName: userName,
                    mobile: mobile,
                    userId: candidate,
                    referralCode: code,
                    referredBy: referrer ? referrer.uid : "",
                    createdAt: stamp,
                    wallet: {
                        balance: 0,
                        totalEarnings: 0,
                        totalDeposits: 0,
                        totalWithdrawals: 0
                    }
                });

                batch.set(db.collection("referralCodes").doc(code), {
                    code: code,
                    uid: user.uid,
                    userName: userName,
                    createdAt: stamp
                });

                batch.set(db.collection("userIds").doc(candidate), {
                    uid: user.uid,
                    userId: candidate,
                    createdAt: stamp
                });

                if (referrer) {
                    batch.set(db.collection("referrals").doc(referrer.uid + "_" + user.uid), {
                        referrerUid: referrer.uid,
                        referredUid: user.uid,
                        referredUserName: userName,
                        createdAt: stamp
                    });
                }

                try {
                    await batch.commit();
                    savedUserId = candidate;
                    break;
                } catch (e) {
                    lastError = e;
                    if (e && e.code === "already-exists") continue;

                    if (e && e.code === "permission-denied") {
                        var collision = false;
                        try {
                            var idSnap = await db.collection("userIds").doc(candidate).get();
                            collision = idSnap.exists;
                        } catch (ignore) { }
                        if (collision) continue;

                        var fallback = db.batch();
                        fallback.set(db.collection("users").doc(user.uid), {
                            userName: userName,
                            mobile: mobile,
                            userId: candidate,
                            referralCode: code,
                            referredBy: referrer ? referrer.uid : "",
                            createdAt: stamp,
                            wallet: {
                                balance: 0,
                                totalEarnings: 0,
                                totalDeposits: 0,
                                totalWithdrawals: 0
                            }
                        });
                        fallback.set(db.collection("referralCodes").doc(code), {
                            code: code,
                            uid: user.uid,
                            userName: userName,
                            createdAt: stamp
                        });
                        if (referrer) {
                            fallback.set(db.collection("referrals").doc(referrer.uid + "_" + user.uid), {
                                referrerUid: referrer.uid,
                                referredUid: user.uid,
                                referredUserName: userName,
                                createdAt: stamp
                            });
                        }
                        await fallback.commit();
                        savedUserId = candidate;
                        break;
                    }
                    throw e;
                }
            }

            if (!savedUserId) throw lastError || new Error("User ID generate nahi hua.");
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

    function emptyProfileForUser(user) {
        var email = String((user && user.email) || "");
        var mobile = "";
        var match = email.match(/^m(\d{10})@/i);
        if (match) mobile = match[1];

        var userName = String((user && user.displayName) || "").trim();
        if (!userName) userName = email ? email.split("@")[0] : "Player";
        if (!userName || userName.length < 3) userName = "Player";

        var code = codeFromUid(user.uid);
        return {
            userName: userName,
            mobile: mobile,
            referralCode: code,
            referredBy: "",
            wallet: {
                balance: 0,
                totalEarnings: 0,
                totalDeposits: 0,
                totalWithdrawals: 0
            }
        };
    }

    async function createMissingProfile(user) {
        if (!user || !user.uid) return null;
        var profile = emptyProfileForUser(user);
        var stamp = firebase.firestore.FieldValue.serverTimestamp();

        try {
            var batch = db.batch();
            batch.set(db.collection("users").doc(user.uid), {
                userName: profile.userName,
                mobile: profile.mobile,
                referralCode: profile.referralCode,
                referredBy: "",
                createdAt: stamp,
                wallet: profile.wallet
            });
            batch.set(db.collection("referralCodes").doc(profile.referralCode), {
                code: profile.referralCode,
                uid: user.uid,
                userName: profile.userName,
                createdAt: stamp
            });
            await batch.commit();
        } catch (e) {
            return await db.runTransaction(async function (tx) {
                var ref = db.collection("users").doc(user.uid);
                var snap = await tx.get(ref);
                if (snap.exists) {
                    var current = snap.data() || {};
                    current.uid = user.uid;
                    return current;
                }
                tx.set(ref, {
                    userName: profile.userName,
                    mobile: profile.mobile,
                    referralCode: profile.referralCode,
                    referredBy: "",
                    createdAt: stamp,
                    wallet: profile.wallet
                });
                profile.uid = user.uid;
                return profile;
            });
        }

        profile.uid = user.uid;
        return profile;
    }

    async function loadProfile(uid) {
        if (!db) return null;
        try {
            var snap = await withTimeout(db.collection("users").doc(uid).get(), 8000);
            if (snap.exists) {
                var data = snap.data();
                data.uid = uid;
                await ensureUserId(data, uid);
                return data;
            }

            var user = auth && auth.currentUser;
            if (!user || user.uid !== uid) return null;
            var created = await createMissingProfile(user);
            if (created) await ensureUserId(created, uid);
            return created;
        } catch (e) {
            console.error("Profile load/create failed:", e);
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

    async function requestEmailVerification(user, emailValue) {
        ensureReady();
        if (!user || !user.uid) throw makeError("profile/email", "Profile load nahi hua. Reload karo.");
        var email = String(emailValue == null ? "" : emailValue).trim().toLowerCase();
        if (!isValidEmail(email)) throw makeError("form/email", "Valid email address daalo.");
        if (email.length > 120) throw makeError("form/email", "Email 120 characters se chhota rakho.");

        await withTimeout(db.collection("users").doc(user.uid).update({
            email: email,
            emailVerified: false,
            emailVerificationRequestedAt: firebase.firestore.FieldValue.serverTimestamp()
        }), 10000);

        return email;
    }

    async function updatePhoto(user, photo) {
        ensureReady();
        if (!user || !user.uid) throw makeError("profile/photo", "Profile load nahi hua. Reload karo.");
        var value = String(photo || "");
        if (value && !/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)) {
            throw makeError("form/photo", "Sirf gallery se image select karo.");
        }
        if (value.length > 240000) {
            throw makeError("form/photo", "Photo bahut badi hai. Chhoti image select karo.");
        }
        await withTimeout(db.collection("users").doc(user.uid).update({ photo: value }), 10000);
        return value;
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

export {
    auth,
    normalizeMobile,
    isValidMobile,
    mobileToEmail,
    passwordProblem,
    isValidEmail,
    friendlyAuthError,
    register,
    login,
    loadProfile,
    createMissingProfile,
    ensureUserId,
    requestEmailVerification,
    updatePhoto,
    requireUser,
    redirectIfLoggedIn,
    logout,
    updateUserName,
    changePassword
};
