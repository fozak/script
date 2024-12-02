chrome.identity.getProfileUserInfo(function(userInfo) {
    if (userInfo.email) {
        console.log("User is signed in with email:", userInfo.email);
        chrome.storage.local.set({ userEmail: userInfo.email }, function() {
            console.log("User email saved to storage.");
        });
    } else {
        console.log("User is not signed in.");
        chrome.storage.local.set({ userEmail: null }, function() {
            console.log("User email set to null in storage.");
        });
    }
});