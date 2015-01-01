define([
    'sinon',
    'qunit',
    'test-utils',
    'dist/video'
], function(
    Sinon,
    QUnit,
    TestUtils,
    Video
){
    "use strict";

    QUnit.module('Youtube Video Tests');

    QUnit.test('loading a video', function () {
        QUnit.expect(15);
        var videoId = 'nOEw9iiopwI';
        var html = '<video width="640" height="360" id="player1">' +
            '<source type="video/youtube" src="http://www.youtube.com/watch?v=' + videoId + '" />' +
        '</video>';
        var fixture = document.getElementById('qunit-fixture');
        fixture.innerHTML = html;
        var loadSpy = Sinon.spy();
        var origYT = window.YT;
        var ytPlayerStub = Sinon.stub();
        window.YT = {Player: ytPlayerStub};
        var stubbedPlayer = {
            playVideo: function (){}
        };
        ytPlayerStub.returns(stubbedPlayer);
        var videoEl = document.getElementById('player1');
        var loadingCssClass = 'v-loading';
        var video = new Video.Youtube({
            el: videoEl,
            loadingCssClass: loadingCssClass
        });
        // setup server
        QUnit.deepEqual(videoEl.parentNode, video._container, 'after initialization, a new container was created that now encapsulates the video element');
        video.load(loadSpy);
        QUnit.ok(video._container.classList.contains(loadingCssClass), 'after calling load(), loading css class was added to container');
        QUnit.equal(loadSpy.callCount, 0, 'load callback was not yet fired because javascript file hasnt finished loading yet');
        // trigger script loaded
        window.onYouTubeIframeAPIReady();
        var youtubeElId = 'vplayerv1';
        var youtubeEl = document.getElementById(youtubeElId);
        QUnit.equal(youtubeEl.getAttribute('id'), youtubeElId, 'after javascript file is loaded, a new container was created with a unique id attribute');
        QUnit.ok(!videoEl.parentNode, 'the original video element has been removed from the DOM');
        QUnit.equal(ytPlayerStub.args[0][0], youtubeEl.getAttribute('id'), 'YouTube player constructor was passed unique id attribute of the new container that was created as its first argument');
        var ytPlayerConstructorOptions = ytPlayerStub.args[0][1];
        QUnit.equal(ytPlayerConstructorOptions.width, 640, 'YouTube player constructor was passed width of video element');
        QUnit.equal(ytPlayerConstructorOptions.height, 360, 'YouTube player constructor was passed height of video element');
        QUnit.equal(ytPlayerConstructorOptions.videoId, videoId, 'YouTube player constructor was passed correct video id');
        QUnit.equal(loadSpy.callCount, 0, 'load callback was STILL not fired yet because player hasnt finished loading');
        QUnit.ok(video._container.classList.contains(loadingCssClass), 'container still has loading css class');
        // trigger player ready
        ytPlayerConstructorOptions.events.onReady({target: stubbedPlayer});
        QUnit.deepEqual(loadSpy.args[0], [stubbedPlayer], 'after player is done loading, load callback was fired with the player instance as the first arg');
        QUnit.ok(!video._container.classList.contains(loadingCssClass), 'container no longer has loading css class');
        video.destroy();
        QUnit.equal(document.getElementById(youtubeElId), null, 'video container was removed from the DOM');
        QUnit.equal(videoEl.parentNode, fixture, 'video element was put back in the DOM inside of its original parent');
        window.YT = origYT;
    });

    QUnit.test('when a video is played', function () {
        QUnit.expect(4);
        var html = '<video width="640" height="360" id="player1">' +
                        '<source type="video/youtube" src="http://www.youtube.com/watch?v=nOEw9iiopwI" />' +
                    '</video>';
        var fixture = document.getElementById('qunit-fixture');
        fixture.innerHTML = html;
        var playingClass = 'vid-playing';
        var origYT = window.YT;
        var ytPlayerStub = Sinon.stub();
        window.YT = {Player: ytPlayerStub};
        var stubbedPlayer = {playVideo: Sinon.spy()};
        ytPlayerStub.returns(stubbedPlayer);
        var videoEl = document.getElementById('player1');

        var player = new Video.Youtube({
            el: videoEl,
            playingCssClass: playingClass
        });
        // load player
        player.load();
        window.onYouTubeIframeAPIReady(); // trigger script loaded
        ytPlayerStub.args[0][1].events.onReady({target: stubbedPlayer}); // trigger player loaded
        // test
        QUnit.ok(!player._container.classList.contains(playingClass), 'initially there is no playing css class added to the video container element because the video isnt playing');
        var playSpy = Sinon.spy();
        videoEl.addEventListener('play', playSpy);
        QUnit.equal(playSpy.callCount, 0, 'play event on the video element hasnt been triggered yet');
        ytPlayerStub.args[0][1].events.onStateChange(1); // trigger play
        QUnit.ok(player._container.classList.contains(playingClass), 'when video is played, playing css class has been added to the video container element');
        QUnit.equal(playSpy.callCount, 1, 'play event on the video element has been triggered once');
        player.destroy();
        window.YT = origYT;
    });

    QUnit.test('extracting video id from a url', function () {
        QUnit.expect(2);
        QUnit.equal(Video.Youtube.prototype.extractVideoIdFromUrl('http://www.youtube.com/watch?v=nOEw9i3opwI'), 'nOEw9i3opwI', 'correct video id was returned');
        QUnit.equal(Video.Youtube.prototype.extractVideoIdFromUrl('https://www.youtube.com/embed/nCJJdW20uZI'), 'nCJJdW20uZI', 'correct video id was returned');
    });

    QUnit.test('test removing script from page when there are are multiple video instances', function () {
        QUnit.expect(3);
        var html = '<video width="640" height="360" id="player1"></video><video width="640" height="360" id="player2"></video>';
        var fixture = document.getElementById('qunit-fixture');
        fixture.innerHTML = html;
        var firstVideoEl = document.getElementById('player1');
        var secondVideoEl = document.getElementById('player2');
        var playingClass = 'vid-playing';
        var firstPlayer = new Video.Youtube({el: firstVideoEl});
        var secondPlayer = new Video.Youtube({el: secondVideoEl});
        var origYT = window.YT;
        var ytPlayerStub = Sinon.stub();
        window.YT = {Player: ytPlayerStub};
        var stubbedPlayer = {playVideo: Sinon.spy()};
        ytPlayerStub.returns(stubbedPlayer);

        firstPlayer.load();
        QUnit.equal(document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]').length, 1, 'after loading first video, youtube script exists in page');
        window.onYouTubeIframeAPIReady(); // trigger script loaded
        secondPlayer.load();
        firstPlayer.destroy();
        QUnit.equal(document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]').length, 1, 'after destroying first video, youtube script still exists in page');
        secondPlayer.destroy();
        QUnit.equal(document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]').length, 0, 'after destroying last existing video, youtube script is removed from page');
        window.YT = origYT;
    });
});