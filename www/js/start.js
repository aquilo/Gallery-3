// import {setup, draw} from './galleryjs.js';

console.log("*** addEventListener added");

/**
 * helper to dynamically load p5-library and code after device is read
 * @param {*} url 
 */
function dynamicallyLoadScript(url) {
    const script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
    console.log("*** dynamicallyLoadScript " + url);
}

function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('**** DeviceReady: Running cordova-' + cordova.platformId + '@' + cordova.version);
    //dynamicallyLoadScript('libs/p5.min.js');

    // add eventlistener when orientation changes, to resize p5-canvas
    window.addEventListener('orientationchange', onOrientationChange);

    // eventlistener for pause/resume/menubutton ()
    // document.addEventListener('pause', onPause, false);
    // document.addEventListener('resume', onResume, false);
    // document.addEventListener('menubutton', onMenuKeyDown, false);

    // load p5.js library

    // load galleryjs.js, where you can find p5-code
    // dynamicallyLoadScript('js/galleryjs.js');
}

function onOrientationChange() {
    console.log('orientation changed...');
    const widthNew = window.innerwidthNew - 5;
    const height = window.innerHeight - 5;
    //   resizeCanvas(widthNew, height);
    console.log(`widthNew: ${widthNew}, height: ${height}`);
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

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll("section").forEach((section) => {
        section.style.display = "none";
    });

    // Show the selected section
    document.getElementById(sectionId).style.display = "block";
    document.getElementById("defaultCanvas0").style.display = sectionId == "section1" ? "block" : "none";
}

$(document).ready(function () {

    $('.nav-item').click(function () {
        // Remove the active class from all items
        $('.nav-item').removeClass('active');

        // Add the active class to the clicked item
        $(this).addClass('active');

        // Remove the bold-text class from all <span> elements
        $('.nav-item a span').removeClass('bold-text');
        $('.nav-item i').each(function () {
            var iconClass = $(this).attr('class');
            if (iconClass && iconClass.endsWith('-fill')) {
                $(this).attr('class', iconClass.substring(0, iconClass.lastIndexOf('-fill')));
            }
        });
        // Add "-fill" to the <i> element inside the clicked item
        $(this).find('i').each(function () {
            var iconClass = $(this).attr('class');
            $(this).attr('class', iconClass + '-fill');
        });

        // Add the bold-text class to the <span> element inside the clicked item
        $(this).find('a span').addClass('bold-text');

    });

    console.log("*** switches and other interactive elements");

    const switchshowMoveable = document.getElementById("showMoveable");
    switchshowMoveable.addEventListener("change", function () {
        global_show = switchshowMoveable.checked ? 1 : 0;
        mustDraw = true;
        allDraw();
    });

    const switchdoAutoMoves = document.getElementById("doAutoMoves");
    switchdoAutoMoves.addEventListener("change", function () {
        global_auto = switchshowAutoMoveReason.checked ? 1 : 0;
        mustDraw = true;
        allDraw();
    });

    const switchshowAutoMoveReason = document.getElementById("showAutoMoveReason");
    switchshowAutoMoveReason.addEventListener("change", function () {
        global_sayAuto = switchshowAutoMoveReason.checked ? 1 : 0;
        mustDraw = true;
        switchdoAutoMoves.disabled = switchshowAutoMoveReason.checked ? true : false;
    });

    const exportButton = document.getElementById("exportButton");
    exportButton.addEventListener("click", function () {
        exportStatisticsAsCsv();
    });

    const resetButton = document.getElementById("resetButton");
    resetButton.addEventListener("click", function () {
        resetStatistics();
        doStatTable()
        $('#resetStats').modal('hide');

    });

    function handleRangeInput(rangeElement) {
        const output = document.getElementById("output");
        rangeElement.addEventListener("input", function () {
            old_global_mtime = global_mtime;
            global_mtime = -rangeElement.value;
        });
    }

    const speedrange = document.getElementById("speedrange");
    speedrange.value = -global_mtime;
    handleRangeInput(speedrange);

});
