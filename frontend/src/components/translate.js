import React, { useState, useRef } from 'react';


const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null); // State to hold the audio source URL
  const [language, setLanguage] = useState('English');
  const mediaRecorderRef = useRef(null);
  const languages = [
    'Afrikaans', 'Arabic', 'Armenian', 'Azerbaijani', 'Belarusian', 'Bosnian', 'Bulgarian', 'Catalan',
    'Chinese', 'Croatian', 'Czech', 'Danish', 'Dutch', 'English', 'Estonian', 'Finnish', 'French',
    'Galician', 'German', 'Greek', 'Hebrew', 'Hindi', 'Hungarian', 'Icelandic', 'Indonesian', 'Italian',
    'Japanese', 'Kannada', 'Kazakh', 'Korean', 'Latvian', 'Lithuanian', 'Macedonian', 'Malay', 'Marathi',
    'Maori', 'Nepali', 'Norwegian', 'Persian', 'Polish', 'Portuguese', 'Romanian', 'Russian', 'Serbian',
    'Slovak', 'Slovenian', 'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Thai', 'Turkish',
    'Ukrainian', 'Urdu', 'Vietnamese', 'Welsh'
  ];
  
  const [isLoading, setIsLoading] = useState(false); // State to track loading

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      let chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await uploadRecording(blob);
        setIsRecording(false);
        chunks = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Could not start recording', error);
    }
  };

  const stopRecording = () => {
    setIsLoading(true); // Start spinner
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
  };

  const uploadRecording = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('language', language);

    try {
      setIsLoading(true); // Start spinner
      const response = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.speechUrl) {
        setAudioSrc(data.speechUrl);
      }
      console.log(data);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false); // Stop spinner when fetch is complete or fails
    }
  };

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording || isLoading}>Start Recording</button>
      <button onClick={stopRecording} disabled={!isRecording || isLoading}>Stop Recording</button>
      <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isLoading}>
        {languages.map(lang => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>
      {isLoading ? (

        <div className="loader"></div>
      ) : (
        audioSrc && <audio src={audioSrc} controls />
      )}
    </div>
  );
};

export default AudioRecorder;