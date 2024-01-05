import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

const AudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [translatedTexts, setTranslatedTexts] = useState([]);
    const [language, setLanguage] = useState('English');
    const mediaRecorderRef = useRef(null);
    const socketRef = useRef(null);

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

        socketRef.current.on('chunkProcessed', (data) => {
            const { translatedText } = data;
            setTranslatedTexts(prev => [...prev, translatedText]);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const handleDataAvailable = (event) => {
        if (event.data.size > 0 && socketRef.current) {
            socketRef.current.emit('sendChunk', { buffer: event.data, language });
        }
    };

    const startRecording = async () => {
        setIsRecording(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
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
                {translatedTexts.map((text, index) => (
                    <p key={index}>Translated Text: {text}</p>
                ))}
            </div>
        </div>
    );
};

export default AudioRecorder;