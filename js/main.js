// hide lightbox
$('.lightbox').ready(function() { $('.lightbox').hide(); });

var photosDone;
var albumsDone;
var profileDone;
// START
$(onReady);
var photos = false;
var albums = false;
var userData = false;
var page = false;
var pageNo = 1;
var loading = false;

function onReady() {
  setUpListeners();
  getContainer().css('margin-top', $('.header').outerHeight());
  getContainer().hide();
  showLoader();
  loadData(function() {
    hideLoader();
    getContainer().show();
    render();
  });
  updateFooter();
}

function setUpListeners(xmlData) {
  $('.controls a[data-page=feed]').click(onFeedClicked);
  $('.controls a[data-page="wall"]').click(onWallClicked);
  $('.controls a[data-page="albums"]').click(onAlbumsClicked);

  $('.lightbox img').click(closeLightBox);
  $('a.up').click(onUpClicked);

  $(document).scroll(onPageScroll);
}

function loadData(dataLoaded) {
  loadPhotos(function() {
    photosDone = true;
    checkLoadStatus();
  });
  loadAlbums(function() {
    albumsDone = true;
    checkLoadStatus();
  });
  loadProfile(function() {
    profileDone = true;
    checkLoadStatus();
  });
  function checkLoadStatus() {
    if(photosDone && albumsDone && profileDone) dataLoaded();
  }
}

function loadPhotos(loaded) {
  $.getJSON('https://api.flickr.com/services/rest/?method=flickr.people.getPhotos&jsoncallback=?', {
    api_key: '1be25adcdc5b396e8bc795271fb8f0d7',
    user_id: '12202482@N03',
    extras: 'date_upload,date_taken,views',
    format: 'json'
  }, function done(data, message, response) {
    if(response.status === 200) processPhotoData(data.photos);
    loaded();
  });
}

function processPhotoData(data) {
  photos = data.photo;
  for(var i = 0, count = photos.length; i < count; i++) {
    // convert dates for easy access
    photos[i].datetaken = new Date(photos[i].datetaken);
    photos[i].dateupload = new Date(parseInt(photos[i].dateupload));
  }
  photos.sort(function reverseChronological(a, b) {
    if(a.datetaken > b.datetaken) return -1;
    else if(a.datetaken < b.datetaken) return 1;
    return 0;
  });
}

function loadAlbums(loaded) {
  albums = [];
  albumsLoaded = [];
  var albumData;
  var albumsToLoad = -1;
  var index = 0;
  $.getJSON('https://api.flickr.com/services/rest/?method=flickr.photosets.getList&jsoncallback=?', {
    api_key: '1be25adcdc5b396e8bc795271fb8f0d7',
    user_id: '12202482@N03',
    per_page: 100,
    primary_photo_extras: 'date_taken',
    format: 'json'
  }, function done(data, message, response) {
    if(response.status === 200) {
      albumsToLoad = data.photosets.photoset.length;
      albumData = data;
      loadAlbumData();
    } else {
      loaded();
    }
  });
  function loadAlbumData() {
    var album = albumData.photosets.photoset[index++];
    $.getJSON('https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&jsoncallback=?', {
      api_key: '1be25adcdc5b396e8bc795271fb8f0d7',
      photoset_id: album.id,
      user_id: '12202482@N03',
      format: 'json'
    }, function done(data, message, response) {
      if(response.status === 200) {
        albums.push({
          id: album.id,
          title: album.title._content,
          description: album.description._content,
          datetaken: album.primary_photo_extras.datetaken,
          views: album.count_views,
          primary: album.primary,
          farm: album.farm,
          server: album.server,
          secret: album.secret,
          photos: data.photoset.photo
        });
      }
      checkLoaded(album.id);
      if(index < albumsToLoad) loadAlbumData();
    });
  }
  function checkLoaded(albumId) {
    var index = (function() { for(var i = 0, c = albumsLoaded.length; i < c; i++) { if(albumsLoaded[i] === albumId) return i; } return -1; })();
    if(index < 0) albumsLoaded.push(albumId);
    if(albumsToLoad === albums.length) loaded();
  }
}

function loadProfile(loaded) {
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

      $('.header .title a').attr('href', userData.profileurl);
    }
    loaded();
  });
}

function updateFooter() {
  $('.footer .year').html((new Date()).getFullYear());
}

function render() {
  renderFeed();
  $('.footer').css('position', 'initial');
}

function renderFeed(event) {
  event && event.preventDefault();

  var TYPE = 'feed';
  if(page === TYPE) return;
  page = TYPE;

  getContainer().empty();

  renderFeedPage(pageNo);
}

function renderFeedPage(newPageNo) {
  pageNo = newPageNo;

  loading = true;
  $('.content').imagesLoaded(onImagesLoaded);

  var PAGE_LENGTH = 20;
  var total = newPageNo*PAGE_LENGTH;

  for(var i = total-PAGE_LENGTH; i < total; i++) {
    renderPhoto(photos[i], page, photoPostDiv, function photoRendered(error, $el) {
      $el.css('opacity', 1);
    });
  }
}

function renderWall(event) {
  event && event.preventDefault();

  var TYPE = 'wall';
  if(page === TYPE) return;
  page = TYPE;

  getContainer().empty();

  var photosLoaded = 0;
  var min = 10;

  for(var i = 0; i < photos.length; i++) {
    renderPhoto(photos[i], TYPE, photoWallDiv, function photoRendered(error, $el) {
      $el.css({
        "margin-right": getRandomPhotoSpacing(),
        "margin-bottom": getRandomPhotoSpacing()
      });
      $el.css('opacity', 1);
    });
  }
}

function renderAlbums() {
  var TYPE = 'albums';
  if(page === TYPE) return;
  page = TYPE;

  var container = getContainer();
  container.empty();
  for(var i = 0, count = albums.length; i < count; i++) {
    var album = albums[i];
    var date = new Date(album.datetaken);
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var thumbUrl = getPhotoURL(album.primary, album.farm, album.server, album.secret, 'm');
    var div = '<div class="album" data-id="' + album.id + '">';
      div += '<div class="thumb" style="background-image: url(' + thumbUrl + ');"></div>';
      div += '<div class="title">';
        div += '<div class="inner">' + album.title + '</div>';
      div += '</div>';
      // div += '<div class="date">' + months[date.getMonth()].substr(0,3) + ' ' + date.getFullYear() + '</div>';
    div += '</div>';
    container.append(div);
  }

  $('.album').click(onAlbumClicked);
}

function renderAlbum(album) {
  var TYPE = 'album';
  if(page === TYPE) return;
  page = TYPE;

  var container = getContainer();
  container.empty();

  for(var i = 0, count = album.photos.length; i < count; i++) {
    renderPhoto(album.photos[i], 'wall', photoWallDiv, function(error, $photo) {
      $photo
        .css({
          "margin-right": getRandomPhotoSpacing(),
          "margin-bottom": getRandomPhotoSpacing()
        })
        .animate({ opacity: 1 });
    });
  }
}

function renderPhoto(data, type, template, done) {
  var cached = data.cache && data.cache[type];
  getContainer().append(cached || template(data));

  var $photo = $('.photo[id=' + data.id + ']')
    // listen to events
    .click(openLightBox)
    .mouseover(onMouseOver)
    .mouseout(onMouseOut);

  if(!$('img', $photo)[0].complete) {
    $('img', $photo).imagesLoaded()
      .always(function() {
        cachePhoto(type, $photo);
        if(done) done(null, $photo);
      });
  } else {
    if(done) done(null, $photo);
  }
}

function photoPostDiv(data) {
  var url = 'https://www.flickr.com/photos/' + data.owner + '/' + data.id;
  var div =
    '<div class="photo post" id="' + data.id + '">' +
      '<img src=' + getPhotoURL(data.id, data.farm, data.server, data.secret, 'b') + '/>' +
      '<div class="details">' +
        '<div class="date">' + data.datetaken.toDateString() + '</div>' +
        '<a class="title" href="' + url + '" target="_blank">' + data.title + '</a>' +
      '</div>' +
    '</div>';
    return div;
}

function photoWallDiv(data) {
    var url = 'https://www.flickr.com/photos/' + data.owner + '/' + data.id;
    var div =
        '<div class="photo wall" id="' + data.id + '">' +
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
  var photoData = getPhotoById($el.attr('id'));
  if(!photoData) return;
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

function getAlbumById(id) {
  for(var i = 0, count = albums.length; i < count; i++) {
    if(albums[i].id === id) return albums[i];
  }
  console.log('No album found with ID:', id);
  return null;
}

function getPhotoById(id) {
  for(var i = 0; i < photos.length; i++) {
    if(photos[i].id === id) return photos[i];
  }
  console.log('No photo found with ID:', id);
  return null;
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomPhotoSpacing(min, max) {
  return getRandom(min || 15, max || 40);
}

function getContainer() {
  return $('.content > .inner');
}

function openLightBox(event) {
  // default behaviour here
  if(event && $(event.target).attr('href')) return;

  event && event.preventDefault();
  showLoader();
  var imgData = getDataFromURL($('img', this).attr('src'));
  $('.lightbox img').attr('src', '');
  $('.lightbox img').imagesLoaded().done(function() {
    hideLoader();
    $('.lightbox').fadeIn(300).css('z-index',5000);
  });
  $('.lightbox img').attr('src', getPhotoURL(imgData.id,imgData.farm,imgData.server,imgData.secret,'h'));
}

function showLoader() {
  $('.loading').fadeIn(200);
}

function hideLoader() {
  $('.loading').hide();
}

function closeLightBox() {
  $('.lightbox').fadeOut(300);
}

function onPageScroll(event) {
  var preloadScrollThreshold = ($(document).height() - window.innerHeight) - ($(document).height() * 0.10);
  var upScrollThreshold = window.innerHeight * 0.5;
  var scrollPos = $(document).scrollTop();

  if(scrollPos > 15) {
    $('.header').addClass('mini');
  } else {
    $('.header').removeClass('mini');
  }

  if(scrollPos > upScrollThreshold) {
    $('.up').fadeIn();
  } else {
    $('.up').fadeOut();
  }

  if(page === 'feed' && !loading && (scrollPos > preloadScrollThreshold)) {
    renderFeedPage(pageNo+1);
  }
}

function onMouseOver(event) {
  $('.title', this).addClass('over');
}

function onMouseOut(event) {
  $('.title', this).removeClass('over');
}

function onImagesLoaded(event) {
  loading = false;
}

function onUpClicked(event) {
  $('a.up').hide();
}

function onFeedClicked(event) {
  event && event.preventDefault();
  pageNo = 1;
  renderFeed();
}

function onWallClicked(event) {
  event && event.preventDefault();
  renderWall();
}

function onAlbumsClicked(event) {
  event && event.preventDefault();
  renderAlbums();
}

function onAlbumClicked(event) {
  event && event.preventDefault();
  renderAlbum(getAlbumById($(event.currentTarget).attr('data-id')));
}

function handleError() {
  console.error(arguments);
}
