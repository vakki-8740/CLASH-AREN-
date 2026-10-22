const PHOTO_PATTERN = /^data:image\/(jpeg|png|webp);base64,/i;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const USER_ID_PATTERN = /^\d{5}$/;

export function getProfileCompletion(profile) {
    const name = String(profile?.userName || "").trim();
    const mobile = String(profile?.mobile || "").replace(/\D/g, "");
    const photo = String(profile?.photo || "");
    const email = String(profile?.email || "").trim();
    const emailVerified = !!email && profile?.emailVerified === true;
    const userId = String(profile?.userId || "").trim();

    const items = [
        { key: "name", label: "Full name", done: name.length >= 3, doneText: name, hint: "Apna naam add karo" },
        { key: "mobile", label: "Registered mobile", done: MOBILE_PATTERN.test(mobile), doneText: mobile ? "+91 " + mobile : "", hint: "Login mobile number" },
        { key: "photo", label: "Profile photo", done: PHOTO_PATTERN.test(photo), doneText: "Photo added", hint: "Profile photo add karo" },
        { key: "email", label: "Email address", done: !!email, doneText: email, hint: "Email add karo" },
        { key: "emailVerified", label: "Email verified", done: emailVerified, doneText: "Verified", hint: email ? "Admin verification pending" : "Pehle email add karo" },
        { key: "userId", label: "User ID", done: USER_ID_PATTERN.test(userId), doneText: userId, hint: "Auto generate ho raha hai" }
    ];

    const completed = items.filter(item => item.done).length;
    return {
        items,
        completed,
        total: items.length,
        pending: items.length - completed,
        percent: Math.round((completed / items.length) * 100),
        complete: completed === items.length
    };
}

export function isProfileComplete(profile) {
    return getProfileCompletion(profile).complete;
}
