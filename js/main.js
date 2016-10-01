// START
$(onReady);
var photos = false;
var userData = false;
var page = false;
function onReady() {
  setUpListeners();
  loadPhotos();
  loadProfile();
  updateFooter();
}

function setUpListeners(xmlData) {
  $('.controls a[data-page=feed]').click(renderFeed);
  $('.controls a[data-page="wall"]').click(renderWall);
  $('.lightbox img').click(closeLightBox);
}

function trackProgress() {
  getContainer().imagesLoaded()
    .always( function( instance ) {
      console.log('all images loaded');
    })
    .done( function( instance ) {
      console.log('all images successfully loaded');
    })
    .fail( function() {
      console.log('all images loaded, at least one is broken');
    })
    .progress( function( instance, image ) {
      var result = image.isLoaded ? 'loaded' : 'broken';
      console.log( 'image is ' + result + ' for ' + image.img.src );
    });
}

function loadPhotos(xmlData) {
  $.getJSON('https://api.flickr.com/services/rest/?method=flickr.people.getPhotos&jsoncallback=?', {
    api_key: '1be25adcdc5b396e8bc795271fb8f0d7',
    user_id: '12202482@N03',
    extras: 'date_upload,date_taken,views',
    format: 'json'
  }, function done(data, message, response) {
    if(response.status === 200) {
      photos = data.photos.photo;
      renderFeed();
    }
  });
}

function loadProfile(xmlData) {
  $.getJSON('https://api.flickr.com/services/rest/?method=flickr.people.getInfo&jsoncallback=?', {
    api_key: '1be25adcdc5b396e8bc795271fb8f0d7',
    user_id: '12202482@N03',
    format: 'json'
  }, function done(data, message, response) {
    if(response.status === 200) {
      userData = {
        profileurl: data.person.profileurl._content,
        location: data.person.location._content,
        realname: data.person.realname._content,
        username: data.person.username._content,
        photocount: data.person.photos.count._content,
        firstphoto: data.person.photos.firstdate._content,
        firsttaken: new Date(data.person.photos.firstdatetaken._content).toDateString()
      };
    }
  });
}

function updateFooter() {
  $('.footer .year').html((new Date()).getFullYear());
}

function renderFeed(event) {
  event && event.preventDefault();
  var TYPE = 'feed';
  if(page === TYPE) return;
  page = TYPE;
  var photosLoaded = 0;
  var PAGE_LENGTH = 15;
  getContainer().empty();
  trackProgress();
  for(var i = 0; i < PAGE_LENGTH; i++) {
    renderPhoto(photos[i], TYPE, photoPostDiv, function photoRendered(error, $el) {
      $el.css('opacity', 1);
    });
  }
}

function renderWall(event) {
  event && event.preventDefault();
  var TYPE = 'wall';
  if(page === TYPE) return;
  page = TYPE;
  var photosLoaded = 0;
  getContainer().empty();
  for(var i = 0; i < photos.length; i++) {
    renderPhoto(photos[i], TYPE, photoWallDiv, function photoRendered(error, $el) {
      var min = 10;
      $el.css({
        "margin-right": getRandom(min,40),
        "margin-bottom": getRandom(min,60)
      });
      $el.css('opacity', 1);
    });
  }
}

function renderPhoto(data, type, template, done) {
  var cached = data.cache && data.cache[type];
  getContainer().append(cached || template(data));

  var $photo = $('.photo[data-id=' + data.id + ']')
    // listen to events
    .click(openLightBox)
    .mouseover(onMouseOver)
    .mouseout(onMouseOut);

  if(!$('img', $photo)[0].complete) {
    $('img', $photo).imagesLoaded()
      .always(function() {
        cachePhoto(type, $photo);
        done(null, $photo);
      });
  } else done(null, $photo);
}

function photoPostDiv(data) {
  var url = 'https://www.flickr.com/photos/' + data.owner + '/' + data.id;
  var div =
    '<div class="photo post" data-id="' + data.id + '">' +
      '<a href="' + url + '" target="_blank">' +
        '<img src=' + getPhotoURL(data.id, data.farm, data.server, data.secret, 'b') + '/>' +
      '</a>' +
      '<div class="details">' +
        '<div class="date">' + new Date(data.datetaken).toDateString() + '</div>' +
        '<div class="title">' + data.title + '</div>' +
      '</div>' +
    '</div>';
    return div;
}

function photoWallDiv(data) {
    var url = 'https://www.flickr.com/photos/' + data.owner + '/' + data.id;
    var div =
        '<div class="photo wall" data-id="' + data.id + '">' +
        '<div class="details">' +
            '<div class="title">' + data.title + '</div>' +
        '</div>' +
        '<a href="' + url + '" target="_blank">' +
            '<img src=' + getPhotoURL(data.id, data.farm, data.server, data.secret) + ' class="thumb"/>' +
        '</a>' +
        '</div>';
        return div;
}

function cachePhoto(cacheName, $el) {
  var photoData = getPhotoById($el.attr('data-id'));
  if(!photoData.cache) photoData.cache = {};
  if(!photoData.cache[cacheName]) photoData.cache[cacheName] = $el;
}

/**
 * Accepted sizes:
 * s:square75 q:square150
 * Measurement on longest side:
 * t:100 m:240 n:320 -:500 z:640 c:800 b:1024 h:1600 k:2048 o:original
 * Default: 500
 */
function getPhotoURL(id, farm, server, secret, size) {
  if(!size) size = '';
  else size = '_' + size;
  return 'https://farm' + farm + '.staticflickr.com/' + server + '/' + id + '_' + secret + size + '.jpg';
}

function getDataFromURL(url) {
  // remove unusable parts
  url = url.replace('https://','').replace('.staticflickr.com','');
  var parts = url.split('/');
  var filename = parts[2].replace(/\..*$/,'').split('_');
  return {
    farm: parts[0].replace('farm',''),
    server: parts[1],
    id: filename[0],
    secret: filename[1],
    size: filename[2]
  };
}

function getPhotoById(id) {
  for(var i = 0; i < photos.length; i++) {
    if(photos[i].id === id) return photos[i];
  }
  return null;
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

function getContainer() {
  return $('.content > .inner');
}

function openLightBox(event) {
  event && event.preventDefault();
  var imgData = getDataFromURL($('img', this).attr('src'));
  $('.lightbox img').attr('src', '');
  $('.lightbox img').imagesLoaded().done(function() {
    $('.lightbox').fadeIn(300).css('z-index',5000);
  });
  $('.lightbox img').attr('src', getPhotoURL(imgData.id,imgData.farm,imgData.server,imgData.secret,'h'));
}

function closeLightBox() {
  $('.lightbox').fadeOut(300);
}

function onMouseOver(event) {
  $('.title', this).addClass('over');
}

function onMouseOut(event) {
  $('.title', this).removeClass('over');
}

function handleError() {
  console.error(arguments);
}
