// Handling all of our errors here by alerting them
function handleError(error) {
  if (error) {
    alert(error.message);
  }
}

let video_apiKey;
let video_sessionId;
let video_token;
let deepAR_license_key;

let deepAR;

// create canvas on which DeepAR will render
var deepARCanvas = document.createElement('canvas');
var mediaStream = deepARCanvas.captureStream(25);
var videoTracks = mediaStream.getVideoTracks();

fetch('/api/video').then(
  async (response) => {
    const { apiKey, sessionId, token, deepARKey } = await response.json();

    video_apiKey = apiKey;
    video_sessionId = sessionId;
    video_token = token;
    deepAR_license_key = deepARKey;

    // start DeepAR
    initDeepAR();
    initializeSession();
  })
  .catch(err => console.log(err));


initDeepAR();
//initializeSession();

function initializeSession() {
  var session = OT.initSession(video_apiKey, video_sessionId);

  // Subscribe to a newly created stream
  session.on('streamCreated', function (event) {
    session.subscribe(event.stream, 'subscriber', {
      insertMode: 'append',
      width: '100%',
      height: '100%'
    }, handleError);
  });

  // Create a publisher
  var publisher = OT.initPublisher('publisher', {
    insertMode: 'append',
    width: '100%',
    height: '100%',
    videoSource: videoTracks[0]
  }, handleError);

  // Connect to the session
  session.connect(video_token, function (error) {
    // If the connection is successful, publish to the session
    if (error) {
      handleError(error);
    } else {
      session.publish(publisher, handleError);
    }
  });
}

function initDeepAR() {

  // Initialize the DeepAR object
  deepAR = DeepAR({
    licenseKey: deepAR_license_key,
    canvasWidth: 640,
    canvasHeight: 480,
    canvas: deepARCanvas,
    numberOfFaces: 1, // how many faces we want to track min 1, max 4
    onInitialize: function () {
      // start video immediately after the initalization, mirror = true
      deepAR.startVideo(true);
    }
  });

  // download the face tracking model
  deepAR.downloadFaceTrackingModel('models/models-68-extreme.bin');
}


var videoObjects = {};
function startExternalVideo() {
  // create video element
  var video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.controls = true;
  video.setAttribute('playsinline', 'playsinline');
  video.style.width = '100%';
  video.style.height = '100%';

  // put it somewhere in the DOM
  var videoContainer = document.createElement('div');
  videoContainer.appendChild(video);
  videoContainer.style.width = '1px';
  videoContainer.style.height = '1px';
  videoContainer.style.position = 'absolute';
  videoContainer.style.top = '0px';
  videoContainer.style.left = '0px';
  videoContainer.style['z-index'] = '-1';
  document.body.appendChild(videoContainer);

  videoObjects.videoContainer = videoContainer;
  videoObjects.video = video;

  navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
    try {
      video.srcObject = stream;
      console.log(stream);
    } catch (error) {
      video.src = URL.createObjectURL(stream);
    }
    setTimeout(function () {
      video.play();
    }, 50);
  }).catch(function (error) {
    console.log('error in video play:', error);
  });

  // tell the DeepAR SDK about our new video element
  console.log('video', video);
  deepAR.setVideoElement(video, true);

  // var loaderWrapper = document.getElementById('loader-wrapper');
  // loaderWrapper.style.display = 'none';
}


function switchARFilter(effect) {
  deepAR.switchEffect(0, `slot${slots}`, `./effects/${effect}`, function () {
    // effect loaded
  });
}

const effectSelect = document.getElementById('effects');
const pills = document.getElementsByClassName('pills')[0];
let slots = 0;

effectSelect.addEventListener('change', addFilter);

function addPill(name, value) {
  let pill = document.createElement('div');
  pill.classList.add('pill');
  pill.innerText = name;
  pill.id = `slot${slots}`;
  pill.addEventListener('click', removeFilter);
  pills.appendChild(pill);
}

function addFilter() {
  const name = effectSelect.selectedOptions[0].innerHTML;
  const value = effectSelect.value;

  if (value !== 0) {
    switchARFilter(value);
    addPill(name, value);
    slots++;
    effectSelect.value = '';
  }
}
function removeFilter(ev) {
  const pill = ev.target;
  const slot = ev.target.id;

  deepAR.clearEffect(slot);
  pills.removeChild(pill);
}