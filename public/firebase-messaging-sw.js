// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDcPbdJ8LssLXsm0UkJ71HZytyDyguZyHk",
  authDomain: "vaidik-talk.firebaseapp.com",
  projectId: "vaidik-talk",
  storageBucket: "vaidik-talk.firebasestorage.app",
  messagingSenderId: "1:1050873892829:web:d0801b0c47e8178df73034",
  appId: "G-7CZ07YJRH1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
