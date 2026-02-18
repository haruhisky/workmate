/**
 * Work Mate Interactive Demo
 * Embedded in the landing page — day-fixed, 3 tracks, default character only
 */
(function () {
  'use strict';

  var ASSET_BASE = 'demo/';

  // ========================================
  // Character Area
  // ========================================
  var CharacterDemo = {
    currentState: 'work',
    previousState: null,
    activeVideoIndex: 0,
    videos: [],
    currentVideoPath: null,
    playingType: 'loop',
    preloadedPath: null,
    _preloadRequestId: 0,
    workTimeSec: 0,
    workTimerInterval: null,
    randomEventTimer: null,
    isPlayingEvent: false,

    RANDOM_EVENTS: {
      work: ['stretch', 'drink', 'think', 'nob'],
      break: ['stretch'],
      slacking: [],
      away: []
    },

    stateConfig: {
      work: { label: 'WORK' },
      break: { label: 'BREAK' },
      away: { label: 'AWAY' },
      slacking: { label: 'SLACKING' }
    },

    init: function () {
      this.el = {
        area: document.querySelector('.demo-character'),
        bg: document.querySelector('.demo-char-bg'),
        label: document.querySelector('.demo-state-label'),
        time: document.querySelector('.demo-work-time')
      };
      this.videos = [
        document.querySelector('.demo-char-video-0'),
        document.querySelector('.demo-char-video-1')
      ];
      this.activeVideoIndex = 0;

      this.updateVideo();
      this.startWorkTimer();
      this.startRandomEventTimer();
    },

    getShortState: function (state) {
      return state === 'slacking' ? 'slack' : state;
    },

    getLoopFileName: function (state) {
      var s = this.getShortState(state);
      if (state === 'work') return 'loop_work_pen_day';
      return 'loop_' + s + '_day';
    },

    getTransFileName: function (from, to) {
      return 'trans_' + this.getShortState(from) + '_to_' + this.getShortState(to) + '_day';
    },

    getEventFileName: function (state, action) {
      return 'event_' + this.getShortState(state) + '_' + action + '_day';
    },

    videoPath: function (folder, baseName) {
      // Use webm with mp4 fallback
      return ASSET_BASE + folder + '/' + baseName;
    },

    setState: function (state) {
      if (state === this.currentState) return;

      this.stopRandomEventTimer();
      this.isPlayingEvent = false;

      var prev = this.currentState;
      this.previousState = prev;
      this.currentState = state;

      // Update UI
      this.el.area.className = 'demo-character state-' + state;
      this.el.label.textContent = this.stateConfig[state].label;

      // Transition animations for certain state changes
      if ((prev === 'work' && state === 'slacking') ||
          (prev === 'slacking' && state === 'work') ||
          (prev === 'away' && state === 'work') ||
          (prev === 'work' && state === 'break') ||
          (prev === 'break' && state === 'work') ||
          (prev === 'slacking' && state === 'away')) {
        this.playTransition(prev, state);
      } else {
        this.updateVideo();
      }

      // Notify pomodoro about state change
      PomodoroDemo.onStateChange(state);
    },

    updateVideo: function () {
      var baseName = this.getLoopFileName(this.currentState);
      this.playLoopVideo(baseName);
    },

    playLoopVideo: function (baseName) {
      var self = this;
      var webmPath = this.videoPath('loop', baseName + '.webm');
      var mp4Path = this.videoPath('loop', baseName + '.mp4');

      this.playingType = 'loop';
      this.currentVideoPath = webmPath;

      this.preloadVideo(webmPath, true, function () {
        if (self.preloadedPath) {
          self.playPreloaded();
          self.updateBg();
          self.startRandomEventTimer();
          return;
        }
        // Fallback to mp4
        self.currentVideoPath = mp4Path;
        self.preloadVideo(mp4Path, true, function () {
          if (self.preloadedPath) {
            self.playPreloaded();
          }
          self.updateBg();
          self.startRandomEventTimer();
        });
      });
    },

    playTransition: function (fromState, toState) {
      var self = this;
      var baseName = this.getTransFileName(fromState, toState);
      var webmPath = this.videoPath('transition', baseName + '.webm');
      var mp4Path = this.videoPath('transition', baseName + '.mp4');
      var loopBaseName = this.getLoopFileName(toState);

      this.playingType = 'transition';
      this.currentVideoPath = webmPath;

      this.preloadVideo(webmPath, false, function () {
        if (!self.preloadedPath) {
          // Try mp4
          self.currentVideoPath = mp4Path;
          self.preloadVideo(mp4Path, false, function () {
            if (!self.preloadedPath) {
              self.playLoopVideo(loopBaseName);
              return;
            }
            self._playTransitionVideo(loopBaseName);
          });
          return;
        }
        self._playTransitionVideo(loopBaseName);
      });
    },

    _playTransitionVideo: function (loopBaseName) {
      var self = this;
      var video = this.getInactiveVideo();

      video.onended = function () {
        video.onended = null;
        self.playLoopVideo(loopBaseName);
      };

      this.swapVideos();
      video.play().catch(function () {
        self.playLoopVideo(loopBaseName);
      });
      this.preloadedPath = null;
      this.updateBg();
    },

    updateBg: function () {
      var s = this.getShortState(this.currentState);
      this.el.bg.style.backgroundImage = 'url(' + ASSET_BASE + 'background/bg_' + s + '_day.png)';
    },

    // Double-buffered video system
    getActiveVideo: function () {
      return this.videos[this.activeVideoIndex];
    },

    getInactiveVideo: function () {
      return this.videos[1 - this.activeVideoIndex];
    },

    swapVideos: function () {
      var oldVideo = this.videos[this.activeVideoIndex];
      var newVideo = this.getInactiveVideo();
      this.activeVideoIndex = 1 - this.activeVideoIndex;
      oldVideo.classList.remove('active');
      newVideo.classList.add('active');
      oldVideo.pause();
    },

    preloadVideo: function (videoPath, isLoop, callback) {
      var self = this;
      var video = this.getInactiveVideo();
      video.oncanplaythrough = null;
      video.onerror = null;

      var requestId = (this._preloadRequestId = (this._preloadRequestId || 0) + 1);

      video.loop = isLoop;
      video.src = videoPath;
      video.load();

      video.oncanplaythrough = function () {
        video.oncanplaythrough = null;
        video.onerror = null;
        if (requestId !== self._preloadRequestId) return;
        self.preloadedPath = videoPath;
        if (callback) callback();
      };

      video.onerror = function () {
        video.onerror = null;
        video.oncanplaythrough = null;
        if (requestId !== self._preloadRequestId) return;
        self.preloadedPath = null;
        if (callback) callback();
      };
    },

    playPreloaded: function () {
      var video = this.getInactiveVideo();
      this.swapVideos();
      video.play().catch(function () {});
      this.preloadedPath = null;
    },

    // Work time counter
    startWorkTimer: function () {
      var self = this;
      this.workTimerInterval = setInterval(function () {
        if (self.currentState === 'work') {
          self.workTimeSec++;
          self.updateTimeDisplay();
        }
      }, 1000);
    },

    updateTimeDisplay: function () {
      var h = Math.floor(this.workTimeSec / 3600);
      var m = Math.floor((this.workTimeSec % 3600) / 60);
      var s = this.workTimeSec % 60;
      var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
      this.el.time.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
    },

    // Random events
    startRandomEventTimer: function () {
      this.stopRandomEventTimer();
      if (this.isPlayingEvent) return;

      var self = this;
      var events = this.RANDOM_EVENTS[this.currentState];
      if (!events || events.length === 0) return;

      var delay = 60000 + Math.random() * 120000; // 60-180s
      this.randomEventTimer = setTimeout(function () {
        self.triggerRandomEvent();
      }, delay);
    },

    stopRandomEventTimer: function () {
      if (this.randomEventTimer) {
        clearTimeout(this.randomEventTimer);
        this.randomEventTimer = null;
      }
    },

    triggerRandomEvent: function () {
      var events = this.RANDOM_EVENTS[this.currentState];
      if (!events || events.length === 0 || this.playingType !== 'loop') return;

      var action = events[Math.floor(Math.random() * events.length)];
      var baseName = this.getEventFileName(this.currentState, action);
      var webmPath = this.videoPath('event', baseName + '.webm');
      var mp4Path = this.videoPath('event', baseName + '.mp4');
      var self = this;

      this.isPlayingEvent = true;
      this.playingType = 'event';
      this.currentVideoPath = webmPath;

      var loopBaseName = this.getLoopFileName(this.currentState);

      this.preloadVideo(webmPath, false, function () {
        if (!self.preloadedPath) {
          self.currentVideoPath = mp4Path;
          self.preloadVideo(mp4Path, false, function () {
            if (!self.preloadedPath) {
              self.isPlayingEvent = false;
              self.playLoopVideo(loopBaseName);
              return;
            }
            self._playEventVideo(loopBaseName);
          });
          return;
        }
        self._playEventVideo(loopBaseName);
      });
    },

    _playEventVideo: function (loopBaseName) {
      var self = this;
      var video = this.getInactiveVideo();

      video.onended = function () {
        video.onended = null;
        self.isPlayingEvent = false;
        self.playLoopVideo(loopBaseName);
      };

      this.swapVideos();
      video.play().catch(function () {
        self.isPlayingEvent = false;
        self.playLoopVideo(loopBaseName);
      });
      this.preloadedPath = null;
    }
  };

  // ========================================
  // Pomodoro Timer
  // ========================================
  var PomodoroDemo = {
    state: 'idle', // idle, work, break
    isRunning: false,
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    completedCount: 0,
    tickInterval: null,
    circumference: 0,

    init: function () {
      this.el = {
        panel: document.querySelector('.demo-panel-timer'),
        time: document.querySelector('.demo-pomo-time'),
        statusIcon: document.querySelector('.demo-pomo-status-icon'),
        statusLabel: document.querySelector('.demo-pomo-status-label'),
        startBtn: document.querySelector('.demo-pomo-start'),
        resetBtn: document.querySelector('.demo-pomo-reset'),
        progressBar: document.querySelector('.demo-pomo-progress'),
        countValue: document.querySelector('.demo-pomo-count-value')
      };

      var radius = 68;
      this.circumference = 2 * Math.PI * radius;
      this.el.progressBar.style.strokeDasharray = this.circumference;
      this.el.progressBar.style.strokeDashoffset = this.circumference;

      var self = this;
      this.el.startBtn.addEventListener('click', function () {
        self.toggleStartPause();
      });
      this.el.resetBtn.addEventListener('click', function () {
        self.reset();
      });

      this.updateDisplay();
    },

    toggleStartPause: function () {
      if (!this.isRunning) {
        this.start();
      } else {
        this.pause();
      }
    },

    start: function () {
      if (this.state === 'idle') {
        this.state = 'work';
        this.totalSeconds = this.workDuration;
        this.remainingSeconds = this.workDuration;
        this.updateStatus();
      }
      this.isRunning = true;
      this.el.startBtn.textContent = '⏸';

      var self = this;
      this.tickInterval = setInterval(function () {
        self.tick();
      }, 1000);
    },

    pause: function () {
      this.isRunning = false;
      this.el.startBtn.textContent = '▶';
      if (this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
    },

    reset: function () {
      this.pause();
      this.state = 'idle';
      this.totalSeconds = this.workDuration;
      this.remainingSeconds = this.workDuration;
      this.el.panel.classList.remove('break-mode');
      this.updateStatus();
      this.updateDisplay();
    },

    tick: function () {
      // Only tick when in WORK state (pomodoro pauses during non-work)
      if (this.state === 'work' && CharacterDemo.currentState !== 'work') {
        return; // Timer paused because not working
      }

      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) {
        this.onComplete();
        return;
      }
      this.updateDisplay();
    },

    onComplete: function () {
      if (this.state === 'work') {
        this.completedCount++;
        this.el.countValue.textContent = this.completedCount;
        // Switch to break
        this.state = 'break';
        this.totalSeconds = this.breakDuration;
        this.remainingSeconds = this.breakDuration;
        this.el.panel.classList.add('break-mode');
        this.updateStatus();
        this.updateDisplay();
      } else if (this.state === 'break') {
        // Break complete, back to work
        this.state = 'work';
        this.totalSeconds = this.workDuration;
        this.remainingSeconds = this.workDuration;
        this.el.panel.classList.remove('break-mode');
        this.updateStatus();
        this.updateDisplay();
      }
    },

    updateDisplay: function () {
      var min = Math.floor(this.remainingSeconds / 60);
      var sec = this.remainingSeconds % 60;
      this.el.time.textContent = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;

      // Progress ring
      var progress = this.totalSeconds > 0
        ? (this.totalSeconds - this.remainingSeconds) / this.totalSeconds
        : 0;
      var offset = this.circumference * (1 - progress);
      this.el.progressBar.style.strokeDashoffset = offset;
    },

    updateStatus: function () {
      if (this.state === 'idle') {
        this.el.statusIcon.textContent = '⏱';
        this.el.statusLabel.textContent = 'Ready';
      } else if (this.state === 'work') {
        this.el.statusIcon.textContent = '💻';
        this.el.statusLabel.textContent = 'Focus Time';
      } else if (this.state === 'break') {
        this.el.statusIcon.textContent = '☕';
        this.el.statusLabel.textContent = 'Break Time';
      }
    },

    onStateChange: function (activityState) {
      // Pomodoro auto-pauses when not in work state
      // Visual feedback could be added here
    }
  };

  // ========================================
  // Music Player
  // ========================================
  var MusicDemo = {
    tracks: [
      { name: 'Minimalist', file: 'Minimalist.mp3' },
      { name: 'gentle rain', file: 'gentle rain.mp3' },
      { name: 'Water Lily', file: 'Water Lily.mp3' }
    ],
    currentIndex: 0,
    isPlaying: false,
    audio: null,

    init: function () {
      this.audio = new Audio();
      this.audio.volume = 0.5;

      this.el = {
        nowTrack: document.querySelector('.demo-music-now-track'),
        playBtn: document.querySelector('.demo-music-play'),
        prevBtn: document.querySelector('.demo-music-prev'),
        nextBtn: document.querySelector('.demo-music-next'),
        loopBtn: document.querySelector('.demo-music-loop'),
        volumeSlider: document.querySelector('.demo-volume-slider'),
        playlistItems: document.querySelector('.demo-playlist-items')
      };

      var self = this;
      this.el.playBtn.addEventListener('click', function () { self.togglePlay(); });
      this.el.prevBtn.addEventListener('click', function () { self.prev(); });
      this.el.nextBtn.addEventListener('click', function () { self.next(); });
      this.el.volumeSlider.addEventListener('input', function () {
        self.audio.volume = this.value / 100;
      });

      this.audio.addEventListener('ended', function () {
        self.next();
      });

      this.renderPlaylist();
      this.loadTrack(0);
    },

    renderPlaylist: function () {
      var self = this;
      var html = '';
      for (var i = 0; i < this.tracks.length; i++) {
        html += '<div class="demo-playlist-item' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
          '<span class="demo-playlist-num">' + (i + 1) + '</span>' +
          '<span class="demo-playlist-name">' + this.tracks[i].name + '</span>' +
          '</div>';
      }
      this.el.playlistItems.innerHTML = html;

      this.el.playlistItems.addEventListener('click', function (e) {
        var item = e.target.closest('.demo-playlist-item');
        if (item) {
          var idx = parseInt(item.getAttribute('data-index'), 10);
          self.loadTrack(idx);
          self.play();
        }
      });
    },

    loadTrack: function (index) {
      this.currentIndex = index;
      var track = this.tracks[index];
      this.audio.src = ASSET_BASE + 'music/' + track.file;
      this.el.nowTrack.textContent = track.name;
      this.highlightPlaylistItem(index);
    },

    highlightPlaylistItem: function (index) {
      var items = this.el.playlistItems.querySelectorAll('.demo-playlist-item');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('active', i === index);
      }
    },

    togglePlay: function () {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },

    play: function () {
      var self = this;
      this.audio.play().then(function () {
        self.isPlaying = true;
        self.el.playBtn.textContent = '⏸';
      }).catch(function () {
        // Autoplay blocked
      });
    },

    pause: function () {
      this.audio.pause();
      this.isPlaying = false;
      this.el.playBtn.textContent = '▶';
    },

    next: function () {
      var idx = (this.currentIndex + 1) % this.tracks.length;
      this.loadTrack(idx);
      if (this.isPlaying) this.play();
    },

    prev: function () {
      var idx = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
      this.loadTrack(idx);
      if (this.isPlaying) this.play();
    }
  };

  // ========================================
  // Navigation
  // ========================================
  var Navigation = {
    activeTab: 'timer',

    init: function () {
      var self = this;
      var tabs = document.querySelectorAll('.demo-nav-tab');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var tabName = this.getAttribute('data-tab');
          if (this.classList.contains('locked')) return;
          self.switchTab(tabName);
        });
      });
    },

    switchTab: function (tabName) {
      this.activeTab = tabName;

      // Update nav buttons
      var tabs = document.querySelectorAll('.demo-nav-tab');
      tabs.forEach(function (tab) {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
      });

      // Update panels
      var panels = document.querySelectorAll('.demo-panel');
      panels.forEach(function (panel) {
        panel.classList.toggle('active', panel.getAttribute('data-panel') === tabName);
      });
    }
  };

  // ========================================
  // State Buttons
  // ========================================
  function initStateButtons() {
    var buttons = document.querySelectorAll('.demo-state-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var state = this.getAttribute('data-state');
        CharacterDemo.setState(state);

        // Update active button
        buttons.forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-state') === state);
        });
      });
    });
  }

  // ========================================
  // Init
  // ========================================
  function initDemo() {
    // Only init on desktop (mobile shows screenshot gallery)
    if (window.innerWidth <= 768) return;

    var demoEl = document.querySelector('.demo-wrapper');
    if (!demoEl) return;

    CharacterDemo.init();
    PomodoroDemo.init();
    MusicDemo.init();
    Navigation.init();
    initStateButtons();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDemo);
  } else {
    initDemo();
  }

  // Re-init on resize (mobile ↔ desktop switch)
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var demoEl = document.querySelector('.demo-wrapper');
      if (!demoEl) return;
      if (window.innerWidth > 768 && !CharacterDemo.el) {
        initDemo();
      }
    }, 300);
  });
})();
