import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";

interface TodoItem {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  isCompleted: boolean;
}

interface PomodoroTimer {
  minutes: number;
  seconds: number;
  isActive: boolean;
  isBreak: boolean;
  currentTaskId: string | null;
}

interface Settings {
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  notificationsEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number; // 0-1
}

interface YouTubeTrack {
  id: string;
  title: string;
  videoId: string;
  url: string;
}

// Declare YouTube Player API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function PomodoroTracker() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPomodoros, setNewTodoPomodoros] = useState(1);
  const [settings, setSettings] = useState<Settings>({
    workDuration: 25,
    breakDuration: 5,
    notificationsEnabled: true,
    musicEnabled: false,
    musicVolume: 0.5,
  });
  const [timer, setTimer] = useState<PomodoroTimer>({
    minutes: 25,
    seconds: 0,
    isActive: false,
    isBreak: false,
    currentTaskId: null,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [youtubePlaylist, setYoutubePlaylist] = useState<YouTubeTrack[]>([]);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingPomodoros, setEditingPomodoros] = useState(1);

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Load YouTube API
  const loadYouTubeAPI = () => {
    if (window.YT) {
      setIsYouTubeAPIReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsYouTubeAPIReady(true);
    };
  };

  // Initialize YouTube Player
  const initializeYouTubePlayer = () => {
    if (!isYouTubeAPIReady || youtubePlaylist.length === 0) return;

    const player = new window.YT.Player('youtube-player', {
      height: '0',
      width: '0',
      videoId: youtubePlaylist[currentTrack]?.videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event: any) => {
          setYoutubePlayer(event.target);
          event.target.setVolume(settings.musicVolume * 100);
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            nextTrack();
          }
        },
      },
    });
  };

  // Add YouTube track to playlist
  const addYouTubeTrack = async () => {
    if (!newYoutubeUrl.trim()) return;

    const videoId = extractVideoId(newYoutubeUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    // Create new track
    const newTrack: YouTubeTrack = {
      id: Date.now().toString(),
      title: `YouTube Video ${videoId}`, // We'll update this with actual title if possible
      videoId,
      url: newYoutubeUrl,
    };

    setYoutubePlaylist(prev => [...prev, newTrack]);
    setNewYoutubeUrl('');
  };

  // Remove track from playlist
  const removeTrack = (trackId: string) => {
    setYoutubePlaylist(prev => prev.filter(track => track.id !== trackId));
    if (youtubePlaylist.length <= 1) {
      setCurrentTrack(0);
    } else if (currentTrack >= youtubePlaylist.length - 1) {
      setCurrentTrack(0);
    }
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('pomodoro-todos');
    const savedSettings = localStorage.getItem('pomodoro-settings');
    const savedTimer = localStorage.getItem('pomodoro-timer');
    const savedPlaylist = localStorage.getItem('youtube-playlist');

    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos));
      } catch (e) {
        console.error('Failed to parse saved todos:', e);
      }
    }

    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }

    if (savedTimer) {
      try {
        const parsedTimer = JSON.parse(savedTimer);
        setTimer(prev => ({ ...prev, ...parsedTimer, isActive: false })); // Don't auto-resume timer
      } catch (e) {
        console.error('Failed to parse saved timer:', e);
      }
    }

    if (savedPlaylist) {
      try {
        setYoutubePlaylist(JSON.parse(savedPlaylist));
      } catch (e) {
        console.error('Failed to parse saved playlist:', e);
      }
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Load YouTube API
    loadYouTubeAPI();
  }, []);

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pomodoro-todos', JSON.stringify(todos));
  }, [todos]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
  }, [settings]);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pomodoro-timer', JSON.stringify(timer));
  }, [timer]);

  // Save YouTube playlist to localStorage
  useEffect(() => {
    localStorage.setItem('youtube-playlist', JSON.stringify(youtubePlaylist));
  }, [youtubePlaylist]);

  // YouTube Player volume management
  useEffect(() => {
    if (youtubePlayer && youtubePlayer.setVolume) {
      youtubePlayer.setVolume(settings.musicVolume * 100); // YouTube API uses 0-100
    }
  }, [settings.musicVolume, youtubePlayer]);

  // Initialize YouTube Player when API is ready and playlist has items
  useEffect(() => {
    if (isYouTubeAPIReady && youtubePlaylist.length > 0 && !youtubePlayer) {
      initializeYouTubePlayer();
    }
  }, [isYouTubeAPIReady, youtubePlaylist.length, youtubePlayer]);

  // Auto-play/pause music based on settings and timer state
  useEffect(() => {
    if (settings.musicEnabled && timer.isActive && !timer.isBreak && youtubePlaylist.length > 0) {
      playMusic();
    } else {
      pauseMusic();
    }
  }, [settings.musicEnabled, timer.isActive, timer.isBreak, youtubePlayer, youtubePlaylist.length]);

  // Function to show notification
  const showNotification = (title: string, body: string) => {
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '🍅',
      });
    }
  };

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timer.isActive) {
      interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer.seconds > 0) {
            return { ...prevTimer, seconds: prevTimer.seconds - 1 };
          } else if (prevTimer.minutes > 0) {
            return { ...prevTimer, minutes: prevTimer.minutes - 1, seconds: 59 };
          } else {
            // Timer finished
            if (!prevTimer.isBreak && prevTimer.currentTaskId) {
              // Complete a pomodoro for the current task
              setTodos((prevTodos) =>
                prevTodos.map((todo) =>
                  todo.id === prevTimer.currentTaskId
                    ? { ...todo, completedPomodoros: todo.completedPomodoros + 1 }
                    : todo
                )
              );
              showNotification('Pomodoro Complete!', 'Great work! Time for a break.');
            } else if (prevTimer.isBreak) {
              showNotification('Break Over!', 'Ready to get back to work?');
            }
            
            // Switch between work and break
            const newIsBreak = !prevTimer.isBreak;
            const newMinutes = newIsBreak ? settings.breakDuration : settings.workDuration;
            
            return {
              ...prevTimer,
              minutes: newMinutes,
              seconds: 0,
              isActive: false,
              isBreak: newIsBreak,
            };
          }
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isActive]);

  const addTodo = () => {
    if (newTodoTitle.trim()) {
      const newTodo: TodoItem = {
        id: Date.now().toString(),
        title: newTodoTitle.trim(),
        estimatedPomodoros: newTodoPomodoros,
        completedPomodoros: 0,
        isCompleted: false,
      };
      setTodos([...todos, newTodo]);
      setNewTodoTitle("");
      setNewTodoPomodoros(1);
    }
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
    if (timer.currentTaskId === id) {
      setTimer((prev) => ({ ...prev, currentTaskId: null, isActive: false }));
    }
  };

  const toggleTodoComplete = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, isCompleted: !todo.isCompleted } : todo
      )
    );
  };

  const startEditingTask = (task: TodoItem) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingPomodoros(task.estimatedPomodoros);
  };

  const saveTaskEdit = () => {
    if (!editingTaskId || !editingTitle.trim()) return;
    
    setTodos(
      todos.map((todo) =>
        todo.id === editingTaskId
          ? { ...todo, title: editingTitle.trim(), estimatedPomodoros: editingPomodoros }
          : todo
      )
    );
    
    cancelTaskEdit();
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditingTitle("");
    setEditingPomodoros(1);
  };

  const clearAllTasks = () => {
    if (todos.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to clear all ${todos.length} tasks? This action cannot be undone.`
    );
    
    if (confirmed) {
      setTodos([]);
      // Stop timer if it's running and clear current task
      if (timer.currentTaskId) {
        setTimer(prev => ({ ...prev, currentTaskId: null, isActive: false }));
      }
    }
  };

  const startPomodoroForTask = (taskId: string) => {
    setTimer({
      minutes: settings.workDuration,
      seconds: 0,
      isActive: true,
      isBreak: false,
      currentTaskId: taskId,
    });
  };

  const toggleTimer = () => {
    setTimer((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const resetTimer = () => {
    setTimer({
      minutes: timer.isBreak ? settings.breakDuration : settings.workDuration,
      seconds: 0,
      isActive: false,
      isBreak: timer.isBreak,
      currentTaskId: timer.currentTaskId,
    });
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    // If timer is not active, update the timer duration immediately
    if (!timer.isActive) {
      setTimer(prev => ({
        ...prev,
        minutes: prev.isBreak ? (newSettings.breakDuration ?? settings.breakDuration) : (newSettings.workDuration ?? settings.workDuration)
      }));
    }
  };

  // YouTube music control functions
  const playMusic = () => {
    if (youtubePlayer && settings.musicEnabled && youtubePlaylist.length > 0) {
      youtubePlayer.playVideo();
      setIsPlaying(true);
    }
  };

  const pauseMusic = () => {
    if (youtubePlayer) {
      youtubePlayer.pauseVideo();
      setIsPlaying(false);
    }
  };

  const toggleMusic = () => {
    if (isPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  };

  const nextTrack = () => {
    if (youtubePlaylist.length === 0) return;
    const newTrack = (currentTrack + 1) % youtubePlaylist.length;
    setCurrentTrack(newTrack);
    if (youtubePlayer && youtubePlaylist[newTrack]) {
      youtubePlayer.loadVideoById(youtubePlaylist[newTrack].videoId);
      if (isPlaying) {
        setTimeout(() => playMusic(), 500);
      }
    }
  };

  const previousTrack = () => {
    if (youtubePlaylist.length === 0) return;
    const newTrack = currentTrack === 0 ? youtubePlaylist.length - 1 : currentTrack - 1;
    setCurrentTrack(newTrack);
    if (youtubePlayer && youtubePlaylist[newTrack]) {
      youtubePlayer.loadVideoById(youtubePlaylist[newTrack].videoId);
      if (isPlaying) {
        setTimeout(() => playMusic(), 500);
      }
    }
  };

  const switchMode = () => {
    const newIsBreak = !timer.isBreak;
    const newMinutes = newIsBreak ? settings.breakDuration : settings.workDuration;
    
    setTimer({
      minutes: newMinutes,
      seconds: 0,
      isActive: false,
      isBreak: newIsBreak,
      currentTaskId: newIsBreak ? null : timer.currentTaskId, // Clear task when switching to break
    });
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const currentTask = todos.find((todo) => todo.id === timer.currentTaskId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800">🍅 Pomodoro Tracker</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ⚙️ Settings
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.workDuration}
                  onChange={(e) => updateSettings({ workDuration: parseInt(e.target.value) || 25 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.breakDuration}
                  onChange={(e) => updateSettings({ breakDuration: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notifications
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 mr-2"
                  />
                  <span className="text-gray-700">Enable notifications</span>
                </div>
                {settings.notificationsEnabled && 'Notification' in window && Notification.permission !== 'granted' && (
                  <p className="text-sm text-amber-600 mt-1">
                    Please allow notifications in your browser for alerts.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Music
                </label>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.musicEnabled}
                      onChange={(e) => updateSettings({ musicEnabled: e.target.checked })}
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500 mr-2"
                    />
                    <span className="text-gray-700">Enable lofi music</span>
                  </div>
                  {settings.musicEnabled && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Volume</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.musicVolume}
                        onChange={(e) => updateSettings({ musicVolume: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* YouTube Playlist Management */}
            {settings.musicEnabled && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">YouTube Playlist</h3>
                
                {/* Add YouTube URL */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste YouTube URL here..."
                      value={newYoutubeUrl}
                      onChange={(e) => setNewYoutubeUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      onKeyPress={(e) => e.key === "Enter" && addYouTubeTrack()}
                    />
                    <button
                      onClick={addYouTubeTrack}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports youtube.com/watch?v=, youtu.be/, and youtube.com/embed/ URLs
                  </p>
                </div>
                
                {/* Playlist */}
                {youtubePlaylist.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Playlist ({youtubePlaylist.length} tracks)</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {youtubePlaylist.map((track, index) => (
                        <div
                          key={track.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            index === currentTrack
                              ? "bg-red-50 border-red-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600">
                              {index + 1}.
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800 truncate max-w-xs">
                                {track.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {track.videoId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {index === currentTrack && isPlaying && (
                              <span className="text-xs text-red-600 font-medium">Playing</span>
                            )}
                            <button
                              onClick={() => removeTrack(track.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No tracks in playlist</p>
                    <p className="text-xs mt-1">Add YouTube URLs above to create your focus playlist</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timer Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              {timer.isBreak ? "Break Time" : "Focus Time"}
            </h2>
            
            <div className="text-center mb-6">
              <div className="text-6xl font-mono font-bold text-red-600 mb-4">
                {formatTime(timer.minutes, timer.seconds)}
              </div>
              
              {currentTask && !timer.isBreak && (
                <div className="bg-red-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">Working on:</p>
                  <p className="font-semibold text-gray-800">{currentTask.title}</p>
                  <p className="text-sm text-gray-500">
                    {currentTask.completedPomodoros}/{currentTask.estimatedPomodoros} pomodoros
                  </p>
                </div>
              )}
              
              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  onClick={toggleTimer}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    timer.isActive
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {timer.isActive ? "Pause" : "Start"}
                </button>
                <button
                  onClick={resetTimer}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={switchMode}
                  disabled={timer.isActive}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    timer.isActive
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : timer.isBreak
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-orange-600 text-white hover:bg-orange-700"
                  }`}
                  title={timer.isActive ? "Cannot switch mode while timer is running" : `Switch to ${timer.isBreak ? 'Focus' : 'Break'} mode`}
                >
                  {timer.isBreak ? "🎯 Focus" : "☕ Break"}
                </button>
              </div>
              
              {/* Music Player Controls */}
              {settings.musicEnabled && youtubePlaylist.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">🎵 Now Playing</h3>
                    <p className="text-xs text-gray-600">
                      {youtubePlaylist[currentTrack]?.title || 'Loading...'}
                    </p>
                  </div>
                  <div className="flex justify-center items-center gap-3">
                    <button
                      onClick={previousTrack}
                      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                      title="Previous track"
                    >
                      ⏮️
                    </button>
                    <button
                      onClick={toggleMusic}
                      className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                      title={isPlaying ? "Pause music" : "Play music"}
                    >
                      {isPlaying ? "⏸️" : "▶️"}
                    </button>
                    <button
                      onClick={nextTrack}
                      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                      title="Next track"
                    >
                      ⏭️
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Todo Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Add New Task</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter task title..."
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                onKeyPress={(e) => e.key === "Enter" && addTodo()}
              />
              
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Estimated Pomodoros:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newTodoPomodoros}
                  onChange={(e) => setNewTodoPomodoros(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                />
              </div>
              
              <button
                onClick={addTodo}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>

        {/* Todo List */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Tasks</h2>
            {todos.length > 0 && (
              <button
                onClick={clearAllTasks}
                className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium"
              >
                Clear All ({todos.length})
              </button>
            )}
          </div>
          
          {todos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No tasks yet. Add a task above to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    todo.isCompleted
                      ? "bg-green-50 border-green-200"
                      : timer.currentTaskId === todo.id
                      ? "bg-red-50 border-red-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {editingTaskId === todo.id ? (
                    // Editing mode
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={todo.isCompleted}
                          onChange={() => toggleTodoComplete(todo.id)}
                          className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                        />
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                          onKeyPress={(e) => e.key === "Enter" && saveTaskEdit()}
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-gray-700">
                            Estimated Pomodoros:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={editingPomodoros}
                            onChange={(e) => setEditingPomodoros(parseInt(e.target.value) || 1)}
                            className="w-20 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveTaskEdit}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelTaskEdit}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={todo.isCompleted}
                          onChange={() => toggleTodoComplete(todo.id)}
                          className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                        />
                        <div>
                          <h3
                            className={`font-medium ${
                              todo.isCompleted ? "line-through text-gray-500" : "text-gray-800"
                            }`}
                          >
                            {todo.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            🍅 {todo.completedPomodoros}/{todo.estimatedPomodoros} pomodoros
                            {todo.completedPomodoros >= todo.estimatedPomodoros && (
                              <span className="ml-2 text-green-600 font-semibold">✓ Goal reached!</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!todo.isCompleted && (
                          <button
                            onClick={() => startPomodoroForTask(todo.id)}
                            disabled={timer.isActive}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                              timer.isActive
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-red-600 text-white hover:bg-red-700"
                            }`}
                          >
                            Start Pomodoro
                          </button>
                        )}
                        <button
                          onClick={() => startEditingTask(todo)}
                          disabled={editingTaskId !== null}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            editingTaskId !== null
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Hidden YouTube Player */}
        <div id="youtube-player" style={{ display: 'none' }}></div>
      </div>
    </div>
  );
}
