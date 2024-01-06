import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

const AudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [translation, setTranslation] = useState('');
    const [language, setLanguage] = useState('English');
    const mediaRecorderRef = useRef(null);
    const chunkRecorderRef = useRef(null);
    const chunkIntervalRef = useRef(null);
    const audioRef = useRef(null); // Reference for the audio player
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
            const { translatedText: newChunk } = data;
            setTranslation(prev => `${prev} ${newChunk}`.trim());
        });

        socketRef.current.on('completeAudioProcessed', (data) => {
            const { translatedText } = data;
            setTranslation(translatedText);
            socketRef.current.emit('convertToSpeech', { text: translatedText });
        });

        socketRef.current.on('audioData', (data) => {
            const audioBlob = new Blob([new Uint8Array(atob(data.audio).split('').map(c => c.charCodeAt(0)))], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch(e => console.error('Error playing audio:', e));
        });

        socketRef.current.on('ttsError', (error) => {
            console.error('TTS Error:', error.message);
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

    const handleChunkDataAvailable = (event) => {
        if (event.data.size > 0 && socketRef.current) {
            socketRef.current.emit('sendChunkForImmediateProcessing', { buffer: event.data, language });
        }
    };

    const startRecording = async () => {
        setIsRecording(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;

        const chunkRecorder = new MediaRecorder(stream);
        chunkRecorder.ondataavailable = handleChunkDataAvailable;
        chunkRecorderRef.current = chunkRecorder;
        chunkIntervalRef.current = setInterval(() => {
            if (chunkRecorder.state === "recording") {
                chunkRecorder.stop();
                chunkRecorder.start();
            }
        }, 1500);
        chunkRecorder.start();
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (chunkRecorderRef.current) {
            clearInterval(chunkIntervalRef.current);
            chunkRecorderRef.current.stop();
            chunkRecorderRef.current = null;
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
                <p>Translation: {translation}</p>
                <audio ref={audioRef} controls style={{ width: '100%' }}></audio>
            </div>
        </div>
    );
};

export default AudioRecorder;
