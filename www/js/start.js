// import {setup, draw} from './galleryjs.js';

// console.log("*** addEventListener added");

/**
 * helper to dynamically load p5-library and code after device is read
 * @param {*} url 
 */
function dynamicallyLoadScript(url) {
    const script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
    // console.log("*** dynamicallyLoadScript " + url);
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
    const canvas = document.getElementById("defaultCanvas0");
    if (canvas) canvas.style.display = sectionId == "section1" ? "block" : "none";
}

$(document).ready(function () {


    $('.nav-item').click(function () {
        $('.nav-item').removeClass('active');
        $(this).addClass('active');

        // Icons
        $('.nav-item i').removeClass('navblue navgray');
        $('.nav-item i').each(function () {
            var iconClass = $(this).attr('class');
            if (iconClass && iconClass.endsWith('-fill')) {
                $(this).attr('class', iconClass.substring(0, iconClass.lastIndexOf('-fill')));
            }
        });
        $('.nav-item i').addClass('navgray');

        $(this).find('i').each(function () {
            $(this).removeClass('navgray');
            var iconClass = $(this).attr('class');
            $(this).attr('class', iconClass + '-fill');
            $(this).addClass('navblue');
        });
        $(this).addClass('navblue');

        // Text
        $('.nav-item a span').removeClass('navblue navgray').addClass('navgray');
        $(this).find('span').each(function () {
            $(this).removeClass('navgray').addClass('navblue');
        });
    });


    // console.log("*** switches and other interactive elements");

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

    const switchFourColor = document.getElementById("fourColorMode");
    switchFourColor.checked = global_fourcolor === true;
    switchFourColor.addEventListener("change", function () {
        global_fourcolor = switchFourColor.checked;
        set1Pref("fourcolor", global_fourcolor);
        setCards();
        mustDraw = true;
        allDraw();
    });

    const exportButtonMail = document.getElementById("exportButtonMail");
    if (exportButtonMail) {
        exportButtonMail.addEventListener("click", function () {
            exportStatisticsAsMail();
        });
    }

    const exportButton = document.getElementById("exportButton");
    exportButton.addEventListener("click", function () {
        exportStatisticsAsCsv();
    });


    const exportPrefButton = document.getElementById("exportPrefButton");
    exportPrefButton.addEventListener("click", function () {
        exportPreferences();
    });
    /*   
    const importButton = document.getElementById("importButton");
    importButton.addEventListener("click", function () {
        importStatisticsFromCsv();
    });
    
 
    const importPrefButton = document.getElementById("importPrefButton");
    importPrefButton.addEventListener("click", function () {
        importPreferences();
    });
    */

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
       
   // $("#exampleModal").modal();

});