
// import {setup, draw} from './galleryjs.js';

document.addEventListener('deviceready', onDeviceReady, false);
console.log("addEventListener")

/**
 * helper to dynamically load p5-library and code after device is read
 * @param {*} url 
 */
function dynamicallyLoadScript(url) {
    My.print("*** dynamicallyLoadScript " + url);
    const script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
}

function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    My.print('*** DeviceReady: Running cordova-' + cordova.platformId + '@' + cordova.version);

    // add eventlistener when orientation changes, to resize p5-canvas
    window.addEventListener('orientationchange', onOrientationChange);

    // eventlistener for pause/resume/menubutton ()
    document.addEventListener('pause', onPause, false);
    document.addEventListener('resume', onResume, false);
    document.addEventListener('menubutton', onMenuKeyDown, false);
    
    // load p5.js library
    dynamicallyLoadScript('libs/p5.min.js');
    // load galleryjs.js, where you can find p5-code
    dynamicallyLoadScript('js/galleryjs.js');
}

function onOrientationChange() {
    console.log('orientation changed...');
    const width = window.innerWidth-5;
    const height = window.innerHeight-5;
    resizeCanvas(width, height);
    My.print(`width: ${width}, height: ${height}`);
}

function onPause() {
    console.log('pause');
}

function onResume() {
    console.log('resume');
}

function onMenuKeyDown() {
    console.log('menu key pressed');
}