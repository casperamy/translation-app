import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioSrc, setAudioSrc] = useState([]);
  const [language, setLanguage] = useState('English');
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const socketRef = useRef(null);
  const CHUNK_DURATION = 3000; // 3 seconds in milliseconds

  const languages = [
    'Afrikaans', 'Arabic', 'Armenian', 'Azerbaijani', 'Belarusian', 'Bosnian', 'Bulgarian', 'Catalan',
    'Chinese', 'Croatian', 'Czech', 'Danish', 'Dutch', 'English', 'Estonian', 'Finnish', 'French',
    'Galician', 'German', 'Greek', 'Hebrew', 'Hindi', 'Hungarian', 'Icelandic', 'Indonesian', 'Italian',
    'Japanese', 'Kannada', 'Kazakh', 'Korean', 'Latvian', 'Lithuanian', 'Macedonian', 'Malay', 'Marathi',
    'Maori', 'Nepali', 'Norwegian', 'Persian', 'Polish', 'Portuguese', 'Romanian', 'Russian', 'Serbian',
    'Slovak', 'Slovenian', 'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Thai', 'Turkish',
    'Ukrainian', 'Urdu', 'Vietnamese', 'Welsh'
  ];

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('chunkProcessed', (chunkUrl) => {
      setAudioSrc(prev => [...prev, chunkUrl]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleDataAvailable = (event) => {
    if (event.data.size > 0 && socketRef.current) {
      socketRef.current.emit('sendChunk', { buffer: event.data, language });
    }
  };

  const startRecordingChunk = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
  };

  const stopRecordingChunk = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    await startRecordingChunk();
    recordingIntervalRef.current = setInterval(async () => {
      stopRecordingChunk();
      await startRecordingChunk();
    }, CHUNK_DURATION);
  };

  const stopRecording = () => {
    clearInterval(recordingIntervalRef.current);
    stopRecordingChunk();
    setIsRecording(false);
  };

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>Start Recording</button>
      <button onClick={stopRecording} disabled={!isRecording}>Stop Recording</button>
      <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isRecording}>
        {languages.map(lang => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>
      <div>
        {audioSrc.map((src, index) => (
          <audio key={index} src={src} controls />
        ))}
      </div>
    </div>
  );
};

export default AudioRecorder;