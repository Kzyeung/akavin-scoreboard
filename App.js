import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, getDocs, getDoc, query, updateDoc, orderBy, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig.js';

// --- Helper Components & Icons ---

const TrophyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 inline-block text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20l4-4m0 0l-4-4m4 4H3" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
const VsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-4a6 6 0 00-12 0v4" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const DoorOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h3v-2H5V5h1v11h2v-2.293l6-6V5a1 1 0 00-1-1H4a1 1 0 00-1-1zm7.707 5.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V5a1 1 0 011-1h4a1 1 0 100-2H4a1 1 0 00-1 1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>;


const Modal = ({ title, message, onConfirm, onCancel, confirmText, cancelText }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-900 text-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto border border-gray-700">
            <h3 className="text-xl font-bold text-blue-300 mb-4">{title}</h3>
            <p className="text-gray-400 mb-6 whitespace-pre-wrap">{message}</p>
            <div className="flex justify-end space-x-4">
                {onCancel && <button onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition">{cancelText || 'Cancel'}</button>}
                {onConfirm && <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">{confirmText || 'OK'}</button>}
            </div>
        </div>
    </div>
);

// --- New Room System Components ---
function RoomGate({ onJoinRoom, onLogin, user, showCreateForm, onSetShowCreateForm, onCreateRoom }) {
    const [roomCode, setRoomCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async () => {
        if (!roomCode.trim()) {
            setError('Please enter a room code.');
            return;
        }
        setIsLoading(true);
        setError('');
        const success = await onJoinRoom(roomCode.trim().toLowerCase());
        if (!success) {
            setError('Room not found. Please check the code.');
            setIsLoading(false);
        }
    };

    const handleCreateClick = () => {
        if (user && !user.isAnonymous) {
            onSetShowCreateForm(true);
        } else {
            onLogin(true); 
        }
    };
    
    return (
        <div className="max-w-md mx-auto text-center animate-fade-in p-8 bg-gray-800 rounded-xl">
            <h2 className="text-3xl font-bold text-blue-300 mb-4">Welcome!</h2>
            <p className="text-gray-400 mb-8">Join a room to start or create a new one.</p>
            
            <div className="bg-gray-700 p-6 rounded-lg">
                 <h3 className="text-xl font-semibold mb-3">Join an Existing Room</h3>
                <div className="flex flex-col gap-3">
                    <input 
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                        placeholder="Enter Room Code"
                        className="w-full bg-gray-900 text-white placeholder-gray-400 rounded-md px-4 py-3 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={handleJoin} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                        {isLoading ? 'Joining...' : 'Join Room'}
                    </button>
                    {error && <p className="text-red-400 mt-2">{error}</p>}
                </div>
            </div>

            <div className="mt-8">
                <p className="text-gray-500 mb-3">or</p>
                {user && !user.isAnonymous && showCreateForm ? (
                    <CreateRoom onCreateRoom={onCreateRoom} user={user} />
                ) : (
                    <button onClick={handleCreateClick} className="bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700">
                        Create a Room
                    </button>
                )}
            </div>
        </div>
    );
}

function CreateRoom({ onCreateRoom, user }) {
    const [newRoomCode, setNewRoomCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!newRoomCode.trim()) {
            setError('Please enter a code for your new room.');
            return;
        }
        setIsLoading(true);
        setError('');
        const success = await onCreateRoom(newRoomCode.trim().toLowerCase());
        if (!success) {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Create a New Room</h3>
            <p className="text-sm text-gray-400 mb-4">You are signed in as {user.displayName}.</p>
            <div className="flex flex-col gap-3">
                 <input 
                    type="text"
                    value={newRoomCode}
                    onChange={(e) => setNewRoomCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Choose a Room Code"
                    className="w-full bg-gray-900 text-white placeholder-gray-400 rounded-md px-4 py-3 text-center text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button onClick={handleCreate} disabled={isLoading} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700 disabled:bg-gray-500">
                    {isLoading ? 'Creating...' : 'Create Room'}
                </button>
                {error && <p className="text-red-400 mt-2">{error}</p>}
            </div>
        </div>
    );
}

function PlayerRegistration({ players, newPlayerName, setNewPlayerName, onAddPlayer, onRemovePlayer, onStart }) {
    const sortedPlayers = [...players].sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6 text-blue-300">Register Players</h2>
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && onAddPlayer()} placeholder="Enter player name" className="flex-grow bg-gray-700 text-white placeholder-gray-400 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={onAddPlayer} disabled={players.length >= 15} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-500">Add Player</button>
            </div>
            <div className="space-y-3">
                {sortedPlayers.map((p, i) => (
                    <div key={p.id} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center shadow-md"><span className="font-medium text-lg flex items-center"><span className="text-gray-400 mr-3 w-6 text-right">{i + 1}.</span><UserIcon />{p.name}</span><button onClick={() => onRemovePlayer(p.id)} className="text-red-400 hover:text-red-600 font-bold text-xl">&times;</button></div>
                ))}
            </div>
            {players.length > 0 && <div className="mt-8 text-center"><button onClick={onStart} className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-8 rounded-md hover:bg-green-700 transform hover:scale-105">Go to Scoreboard</button></div>}
        </div>
    );
}

function Scoreboard({ players, onPlay, onGoToRegister, onResetGame, onShowHistory }) {
    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6 text-blue-300">Scoreboard</h2>
            <div className="bg-gray-700 rounded-lg shadow-inner p-4">
                <div className="grid grid-cols-3 gap-4 font-bold text-gray-300 mb-3 px-4"><span>Rank</span><span>Player</span><span className="text-right">Points</span></div>
                <div className="space-y-2">
                    {players.length > 0 ? players.map((p, i) => <div key={p.id} className="bg-gray-800 rounded-md p-4 grid grid-cols-3 gap-4 items-center shadow-md"><span className="font-bold text-lg">#{i + 1}</span><span className="truncate">{p.name}</span><span className="text-right font-mono text-lg text-yellow-400">{p.points}</span></div>) : <p className="text-center text-gray-400 py-8">No players registered.</p>}
                </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center flex-wrap gap-4">
                <button onClick={onPlay} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700">Play</button>
                <button onClick={onShowHistory} className="w-full sm:w-auto bg-teal-600 text-white font-bold py-3 px-6 rounded-md hover:bg-teal-700">History</button>
                <button onClick={onGoToRegister} className="w-full sm:w-auto bg-gray-600 text-white font-bold py-3 px-6 rounded-md hover:bg-gray-500">Manage Players</button>
                <button onClick={onResetGame} className="w-full sm:w-auto bg-red-700 text-white font-bold py-3 px-6 rounded-md hover:bg-red-800">Reset Game</button>
            </div>
        </div>
    );
}

function AddPoints({ players, onConfirm, onCancel, tournamentResults = null }) {
    const [gameName, setGameName] = useState(tournamentResults?.gameName || 'Untitled Game');
    const [points, setPoints] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleInputRef = useRef(null);
    
    const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);

    useEffect(() => {
        const newPoints = {};
        if (tournamentResults) {
             tournamentResults.results.forEach(p => newPoints[p.id] = p.points);
        } else {
            players.forEach(p => newPoints[p.id] = 0);
        }
        setPoints(newPoints);
    }, [players, tournamentResults]);

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);

    const handlePointChange = (playerId, value) => setPoints(prev => ({ ...prev, [playerId]: parseInt(value, 10) || 0 }));
    
    const handleConfirm = () => {
        setIsSubmitting(true);
        let results;
        if (tournamentResults) {
            results = tournamentResults.results.map(p => ({...p, points: points[p.id] || 0}));
        } else {
            const playersWithPoints = players.map(p => ({...p, points: points[p.id] || 0 }));
            playersWithPoints.sort((a,b) => b.points - a.points);
            results = playersWithPoints.map((p, i) => ({ id: p.id, name: p.name, points: p.points, rank: i + 1 }));
        }
        const gameResult = { 
            gameName: gameName.trim() || 'Untitled Game', 
            results, 
            type: tournamentResults?.type || 'manual' 
        };
        onConfirm(gameResult);
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="text-center mb-6">
                {isEditingTitle ? (
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyPress={(e) => { if (e.key === 'Enter') setIsEditingTitle(false); }}
                        className="w-full bg-gray-700 text-white placeholder-gray-400 text-center rounded-md px-4 py-2 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 selection:bg-purple-500 selection:text-white"
                    />
                ) : (
                    <div onClick={() => setIsEditingTitle(true)} className="group inline-flex justify-center items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                        <h2 className="text-2xl font-bold text-blue-300">{gameName}</h2>
                        <EditIcon className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
            </div>
            
            <div className="space-y-2">
                {(tournamentResults ? tournamentResults.results : sortedPlayers).map((p, i) => (
                    <div key={p.id} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center shadow-md">
                        <div className="flex items-center">
                            {tournamentResults && <span className="font-bold text-lg text-yellow-400 w-8 text-left mr-4">#{i + 1}</span>}
                            <span className="font-medium">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2"><label className="text-sm text-gray-400">Points:</label><input type="number" value={points[p.id] || ''} onChange={(e) => handlePointChange(p.id, e.target.value)} className="bg-gray-900 w-20 text-white text-center font-mono rounded-md py-1 px-2 focus:outline-none" /></div>
                    </div>
                ))}
            </div>
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button onClick={handleConfirm} disabled={isSubmitting} className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
                     {isSubmitting ? 'Saving...' : 'Confirm Points'}
                </button>
                <button onClick={onCancel} className="w-full sm:w-auto bg-gray-600 text-white font-bold py-3 px-6 rounded-md hover:bg-gray-500">Cancel</button>
            </div>
        </div>
    );
}

function GameHistory({ history, onBack, onDeleteGame, onRenameGame }) {
    const [editingGameId, setEditingGameId] = useState(null);
    const [newGameName, setNewGameName] = useState('');

    const handleStartEditing = (game) => {
        setEditingGameId(game.id);
        setNewGameName(game.gameName);
    };

    const handleCancelEditing = () => {
        setEditingGameId(null);
        setNewGameName('');
    };

    const handleSave = (gameId) => {
        onRenameGame(gameId, newGameName);
        setEditingGameId(null);
        setNewGameName('');
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6 text-blue-300 flex items-center justify-center"><HistoryIcon />Game History</h2>
            <div className="space-y-4">
                {history.length > 0 ? history.map(game => (
                    <div key={game.id} className="bg-gray-700 rounded-lg shadow-lg p-4 relative">
                        <div className="absolute top-2 right-2 flex gap-2">
                            <button onClick={() => handleStartEditing(game)} className="text-gray-400 hover:text-yellow-400 transition-colors"><EditIcon /></button>
                            <button onClick={() => onDeleteGame(game)} className="text-gray-400 hover:text-red-500 font-bold text-xl transition-colors">&times;</button>
                        </div>
                        {editingGameId === game.id ? (
                            <div className="flex items-center gap-2 pr-16">
                                <input type="text" value={newGameName} onChange={(e) => setNewGameName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSave(game.id)} className="flex-grow bg-gray-900 text-white placeholder-gray-400 rounded-md px-3 py-2 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                <button onClick={() => handleSave(game.id)} className="bg-green-600 px-3 py-1 rounded-md">Save</button>
                                <button onClick={handleCancelEditing} className="bg-gray-600 px-3 py-1 rounded-md">Cancel</button>
                            </div>
                        ) : (
                            <h3 className="text-xl font-bold text-purple-300 pr-16">{game.gameName}</h3>
                        )}
                        <p className="text-sm text-gray-400 mb-3">{new Date(game.createdAt?.seconds * 1000).toLocaleString()}</p>
                        <div className="space-y-2">{game.results.map(r => 
                            <div key={r.id} className="bg-gray-800 rounded p-2 grid grid-cols-3 items-center">
                                <span className="font-semibold truncate">
                                    {game.type !== '1v1' && `#${r.rank} `}{r.name}
                                </span>
                                <span className="text-center font-mono">
                                    {game.type === '1v1' && r.wins !== undefined && (
                                        <span className="text-sm">
                                            <span className="text-green-400">W:{r.wins}</span>
                                            <span className="text-gray-500 mx-1">/</span>
                                            <span className="text-red-400">L:{r.losses}</span>
                                        </span>
                                    )}
                                </span>
                                <span className="text-right font-mono text-yellow-400">{r.points} pts</span>
                            </div>
                        )}</div>
                    </div>
                )) : <p className="text-center text-gray-400 py-8">No games recorded.</p>}
            </div>
            <div className="mt-8 text-center"><button onClick={onBack} className="text-gray-400 hover:text-white">&larr; Back to Scoreboard</button></div>
        </div>
    );
}

function PlayMenu({ tournament, players, onCreateTournament, onResume, onAddPoints, onBack }) {
    const playOptions = [
        { type: '1v1', label: '1v1 Tournament', color: 'blue' },
        { type: 'team', label: 'Team Based', color: 'green' },
        { type: 'ffa', label: 'Free For All', color: 'purple' },
        { type: 'mariokart', label: 'Mario Kart', color: 'red', requiredPlayers: 14 },
        { type: 'justfu', label: 'Just Fu', color: 'pink', requiredPlayers: 14 },
    ];

    return (
        <div className="animate-fade-in max-w-sm mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-blue-300">Play a Game</h2>
            <div className="space-y-4">
                <button onClick={onAddPoints} className="w-full bg-gray-600 text-white font-bold py-4 rounded-md hover:bg-gray-500 transition-colors text-lg">Add Points Manually</button>
                <hr className="border-gray-600" />
                {playOptions.map(opt => {
                    const isDisabled = opt.requiredPlayers && players.length !== opt.requiredPlayers;
                    if (tournament && tournament.type === opt.type) {
                        return <button key={opt.type} onClick={onResume} className="w-full bg-orange-600 text-white font-bold py-4 rounded-md hover:bg-orange-500 transition-colors text-lg">Resume {opt.label}</button>
                    }
                    return (
                        <div key={opt.type} className="relative" title={isDisabled ? `Requires exactly ${opt.requiredPlayers} players` : ''}>
                            <button 
                                onClick={() => onCreateTournament(opt.type)} 
                                disabled={isDisabled}
                                className={`w-full bg-${opt.color}-600 text-white font-bold py-4 rounded-md hover:bg-${opt.color}-500 transition-colors text-lg disabled:bg-gray-500 disabled:cursor-not-allowed`}
                            >
                                {opt.label}
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="mt-8 text-center"><button onClick={onBack} className="text-gray-400 hover:text-white">&larr; Back to Scoreboard</button></div>
        </div>
    );
}

function SwissTournament({ tournament, setTournament, players, onFinish, onCancel }) {
    const [finalResults, setFinalResults] = useState(null);
    const [modal, setModal] = useState(null);
    const currentRoundIdx = tournament.rounds.length - 1;
    const currentRound = tournament.rounds[currentRoundIdx];
    const isRoundComplete = currentRound.matches.every(m => m.winner);
    const totalRounds = Math.ceil(Math.log2(players.length));

    const standings = useMemo(() => {
        const playerRecords = tournament.players.map(p => ({ ...p, wins: 0, losses: 0 }));
        tournament.rounds.forEach(round => {
            round.matches.forEach(match => {
                if (match.winner) {
                    const winner = playerRecords.find(p => p.id === match.winner);
                    if (winner) winner.wins++;
                    if (match.p2.id !== 'bye') {
                        const loser = playerRecords.find(p => p.id === (match.p1.id === match.winner ? match.p2.id : match.p1.id));
                        if (loser) loser.losses++;
                    }
                }
            });
        });
        return playerRecords.sort((a,b) => b.wins - a.wins || a.losses - b.losses);
    }, [tournament]);

    const handleSelectWinner = (matchId, winnerId) => {
        const newTournament = JSON.parse(JSON.stringify(tournament));
        const round = newTournament.rounds[currentRoundIdx];
        const match = round.matches.find(m => m.matchId === matchId);
        if (match) {
            match.winner = match.winner === winnerId ? null : winnerId;
        }
        setTournament(newTournament);
    };

    const handleNextRound = () => {
        const updatedPlayers = [...tournament.players];
        currentRound.matches.forEach(match => {
            const winner = updatedPlayers.find(p => p.id === match.winner);
            if (winner) winner.wins = (winner.wins || 0) + 1;
            const p1 = updatedPlayers.find(p => p.id === match.p1.id);
            const p2 = updatedPlayers.find(p => p.id === match.p2.id);
            if (p1 && p2) { p1.opponents.push(p2.id); p2.opponents.push(p1.id); }
        });

        const groups = updatedPlayers.reduce((acc, p) => {
            const wins = p.wins || 0;
            acc[wins] = acc[wins] || [];
            acc[wins].push(p);
            return acc;
        }, {});

        let newPairings = [];
        Object.keys(groups).sort((a, b) => b - a).forEach(winCount => {
            let group = [...groups[winCount]];
            group.sort(() => Math.random() - 0.5);
            while (group.length > 0) {
                if (group.length === 1) {
                    const p1 = group.shift();
                    newPairings.push({ p1, p2: { id: 'bye', name: 'BYE' }, winner: p1.id, matchId: `R${currentRound.round + 1}M${newPairings.length + 1}` });
                    break;
                }
                const p1 = group.shift();
                let p2Index = group.findIndex(p => !p1.opponents.includes(p.id));
                if (p2Index === -1) p2Index = 0;
                const p2 = group.splice(p2Index, 1)[0];
                newPairings.push({ p1, p2, winner: null, matchId: `R${currentRound.round + 1}M${newPairings.length + 1}` });
            }
        });

        const newTournament = JSON.parse(JSON.stringify(tournament));
        newTournament.players = updatedPlayers;
        newTournament.rounds.push({ round: currentRound.round + 1, matches: newPairings });
        setTournament(newTournament);
    };

    const handleFinishTournament = () => {
        const finalPlayers = [...standings];
        const maxPoints = players.length;
        const results = [];
        let currentRank = 1;
    
        for (let i = 0; i < finalPlayers.length; i++) {
            const player = finalPlayers[i];
            let rankToAssign = currentRank;
    
            if (i > 0 && player.wins === finalPlayers[i-1].wins && player.losses === finalPlayers[i-1].losses) {
                rankToAssign = results[i-1].rank;
            } else {
                rankToAssign = i + 1;
                currentRank = i + 1;
            }
    
            results.push({
                id: player.id,
                name: player.name,
                points: maxPoints - rankToAssign + 1,
                rank: rankToAssign,
                wins: player.wins,
                losses: player.losses
            });
        }
    
        setFinalResults({ 
            gameName: `1v1 Tournament - ${new Date().toLocaleDateString()}`, 
            results,
            type: '1v1'
        });
    };

    const handleGoBack = () => {
        setModal({
            title: 'Edit Previous Round?',
            message: 'This will reset the current round and allow you to change the results of the previous round. Are you sure?',
            confirmText: 'Yes, Go Back',
            onConfirm: () => {
                const newTournament = JSON.parse(JSON.stringify(tournament));
                newTournament.rounds.pop();
                const recalculatedPlayers = newTournament.players.map(p => ({ ...p, wins: 0, opponents: [] }));
                newTournament.rounds.forEach(round => {
                    round.matches.forEach(match => {
                        if (match.winner) {
                            const winner = recalculatedPlayers.find(p => p.id === match.winner);
                            if(winner) winner.wins++;
                            const p1 = recalculatedPlayers.find(p => p.id === match.p1.id);
                            const p2 = recalculatedPlayers.find(p => p.id === match.p2.id);
                            if (p1 && p2) { p1.opponents.push(p2.id); p2.opponents.push(p1.id); }
                        }
                    });
                });
                newTournament.players = recalculatedPlayers;
                setTournament(newTournament);
                setModal(null);
            },
            cancelText: 'Cancel',
            onCancel: () => setModal(null)
        });
    };
    
    if (finalResults) {
        return <AddPoints players={players} onConfirm={onFinish} onCancel={() => setFinalResults(null)} tournamentResults={finalResults} />
    }

    const getPlayerWinsBeforeRound = (playerId, roundNumber) => {
        let wins = 0;
        for (let i = 0; i < roundNumber - 1; i++) {
            if (tournament.rounds[i]?.matches.some(m => m.winner === playerId)) wins++;
        }
        return wins;
    };

    const currentMatchesByBracket = currentRound.matches.reduce((acc, match) => {
        const p1Wins = getPlayerWinsBeforeRound(match.p1.id, currentRound.round);
        acc[p1Wins] = acc[p1Wins] || [];
        acc[p1Wins].push(match);
        return acc;
    }, {});
    
    const midPoint = Math.ceil(standings.length / 2);
    const leftColumn = standings.slice(0, midPoint);
    const rightColumn = standings.slice(midPoint);

    return (
        <div className="animate-fade-in">
            {modal && <Modal {...modal} />}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-blue-300">1v1 Tournament</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition bg-gray-700 px-3 py-1 rounded-md">&larr; Exit</button>
            </div>
            
            <div className="max-w-4xl mx-auto p-4 bg-gray-900/50 rounded-lg mb-8">
                <h3 className="text-xl font-bold text-center mb-4 text-yellow-300">Tournament Standings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <div className="flex flex-col space-y-2">
                        <div className="grid grid-cols-4 font-bold text-gray-400 px-2"><span>Rank</span><span>Player</span><span className="text-center">Wins</span><span className="text-center">Losses</span></div>
                        {leftColumn.map((player, index) => (
                            <div key={player.id} className="grid grid-cols-4 bg-gray-700 p-2 rounded-md items-center"><span>#{index + 1}</span><span className="truncate">{player.name}</span><span className="text-center font-mono text-green-400">{player.wins}</span><span className="text-center font-mono text-red-400">{player.losses}</span></div>
                        ))}
                    </div>
                     <div className="flex flex-col space-y-2">
                        <div className="grid grid-cols-4 font-bold text-gray-400 px-2"><span>Rank</span><span>Player</span><span className="text-center">Wins</span><span className="text-center">Losses</span></div>
                        {rightColumn.map((player, index) => (
                            <div key={player.id} className="grid grid-cols-4 bg-gray-700 p-2 rounded-md items-center"><span>#{midPoint + index + 1}</span><span className="truncate">{player.name}</span><span className="text-center font-mono text-green-400">{player.wins}</span><span className="text-center font-mono text-red-400">{player.losses}</span></div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto">
                {Object.keys(currentMatchesByBracket).sort((a,b) => b-a).map(winBracket => (
                    <div key={winBracket} className="mb-6">
                        <h3 className="text-xl font-bold text-center mb-4 text-purple-300">Round {currentRound.round}: {winBracket}-Win Bracket</h3>
                        <div className="space-y-3">
                            {currentMatchesByBracket[winBracket].map(match => (
                                <div key={match.matchId} className={`bg-gray-700 rounded-lg p-4 shadow-md`}>
                                    <div className="flex justify-around items-center">
                                        <button onClick={() => handleSelectWinner(match.matchId, match.p1.id)} className={`flex-1 text-lg font-semibold p-3 rounded-md transition truncate mx-2 ${match.winner === match.p1.id ? 'bg-green-600' : 'bg-gray-800 hover:bg-blue-600'}`}>{match.p1.name}</button>
                                        <VsIcon />
                                        <button onClick={() => handleSelectWinner(match.matchId, match.p2.id)} disabled={match.p2.id === 'bye'} className={`flex-1 text-lg font-semibold p-3 rounded-md transition truncate mx-2 ${match.winner === match.p2.id ? 'bg-green-600' : 'bg-gray-800 hover:bg-blue-600'}`}>{match.p2.name}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                <div className="mt-8 text-center flex justify-center items-center flex-wrap gap-4">
                    {tournament.rounds.length > 1 && <button onClick={handleGoBack} className="bg-yellow-600 text-white font-bold py-3 px-8 rounded-md hover:bg-yellow-700">Edit Previous Round</button>}
                    {isRoundComplete && currentRound.round < totalRounds && <button onClick={handleNextRound} className="bg-green-600 text-white font-bold py-3 px-8 rounded-md hover:bg-green-700">Start Next Round</button>}
                    {isRoundComplete && currentRound.round >= totalRounds && <button onClick={handleFinishTournament} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-md hover:bg-purple-700">Finish Tournament & Award Points</button>}
                </div>
            </div>
        </div>
    );
}

function TeamBasedGame({ tournament, setTournament, onFinish, onCancel }) {
    const [finalResults, setFinalResults] = useState(null);
    const { teamA, teamB, scoreA, scoreB } = tournament;
    const totalPlayers = teamA.length + teamB.length;

    const handleScoreChange = (team, value) => {
        const newScore = parseInt(value, 10) || 0;
        const newTournament = { ...tournament };
        if (team === 'A') newTournament.scoreA = newScore;
        if (team === 'B') newTournament.scoreB = newScore;
        setTournament(newTournament);
    };

    const handleFinish = () => {
        const winningScore = Math.max(scoreA, scoreB);
        const losingScore = Math.min(scoreA, scoreB);
        
        if (winningScore === 0) { // Handle tie or no score
            const results = [...teamA, ...teamB].map((p, i) => ({ id: p.id, name: p.name, points: 0, rank: i + 1 }));
            setFinalResults({ gameName: 'Team Game (Tie)', results, type: 'team' });
            return;
        }

        const winningTeam = scoreA > scoreB ? teamA : teamB;
        const losingTeam = scoreA > scoreB ? teamB : teamA;

        const winnerPoints = totalPlayers;
        const loserPoints = Math.round((losingScore / winningScore) * totalPlayers);

        const results = [
            ...winningTeam.map(p => ({ id: p.id, name: p.name, points: winnerPoints, rank: 1 })),
            ...losingTeam.map(p => ({ id: p.id, name: p.name, points: loserPoints, rank: winningTeam.length + 1 }))
        ];
        setFinalResults({ gameName: 'Team Game', results, type: 'team' });
    };

    if (finalResults) {
        return <AddPoints players={[...teamA, ...teamB]} onConfirm={onFinish} onCancel={() => setFinalResults(null)} tournamentResults={finalResults} />
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-blue-300">Team Based Game</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition bg-gray-700 px-3 py-1 rounded-md">&larr; Exit</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Team A */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-xl font-bold text-center mb-4 text-red-400">Team A</h3>
                    <div className="space-y-2 mb-4">
                        {teamA.map(p => <div key={p.id} className="bg-gray-800 p-2 rounded text-center">{p.name}</div>)}
                    </div>
                    <input type="number" value={scoreA} onChange={e => handleScoreChange('A', e.target.value)} className="w-full bg-gray-900 text-white text-center font-mono text-2xl rounded-md py-2 px-2 focus:outline-none" placeholder="Score"/>
                </div>
                {/* Team B */}
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-xl font-bold text-center mb-4 text-blue-400">Team B</h3>
                     <div className="space-y-2 mb-4">
                        {teamB.map(p => <div key={p.id} className="bg-gray-800 p-2 rounded text-center">{p.name}</div>)}
                    </div>
                    <input type="number" value={scoreB} onChange={e => handleScoreChange('B', e.target.value)} className="w-full bg-gray-900 text-white text-center font-mono text-2xl rounded-md py-2 px-2 focus:outline-none" placeholder="Score"/>
                </div>
            </div>
            <div className="mt-8 text-center">
                <button onClick={handleFinish} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-md hover:bg-purple-700">Finish Game & Award Points</button>
            </div>
        </div>
    );
}

function FreeForAllGame({ tournament, setTournament, onFinish, onCancel }) {
    const [finalResults, setFinalResults] = useState(null);
    const [scores, setScores] = useState(tournament.scores || {});

    const handleScoreChange = (playerId, value) => {
        const newScores = { ...scores, [playerId]: parseInt(value, 10) || 0 };
        setScores(newScores);
        setTournament({ ...tournament, scores: newScores });
    };

    const handleFinish = () => {
        const playersWithScores = tournament.players.map(p => ({
            ...p,
            score: scores[p.id] || 0
        }));

        playersWithScores.sort((a, b) => b.score - a.score);
        
        const maxPoints = playersWithScores.length;

        const results = playersWithScores.map((p, i) => ({
            id: p.id,
            name: p.name,
            points: maxPoints - i,
            rank: i + 1
        }));

        setFinalResults({ gameName: 'Free For All', results, type: 'ffa' });
    };

    if (finalResults) {
        return <AddPoints players={tournament.players} onConfirm={onFinish} onCancel={() => setFinalResults(null)} tournamentResults={finalResults} />
    }

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-blue-300">Free For All</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition bg-gray-700 px-3 py-1 rounded-md">&larr; Exit</button>
            </div>
            
            <p className="text-center text-gray-400 mb-6">Enter the score for each player from the game.</p>

            <div className="space-y-3">
                {tournament.players.map(player => (
                    <div key={player.id} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center shadow-md">
                        <span className="font-medium text-lg">{player.name}</span>
                        <div className="flex items-center gap-2">
                            <label htmlFor={`score-${player.id}`} className="text-sm text-gray-400">Score:</label>
                            <input
                                id={`score-${player.id}`}
                                type="number"
                                value={scores[player.id] || ''}
                                onChange={(e) => handleScoreChange(player.id, e.target.value)}
                                className="bg-gray-900 w-24 text-white text-center font-mono rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 text-center">
                <button onClick={handleFinish} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-md hover:bg-purple-700">Finish Game & Award Points</button>
            </div>
        </div>
    );
}

function MarioKartTournament({ tournament, players, setTournament, onFinish, onCancel }) {
    const [finalResults, setFinalResults] = useState(null);
    const dragPlayer = useRef(null);
    const dragOverPlayer = useRef(null);

    const handleGroupSort = (groupKey, groupPlayers) => {
        const playersClone = [...groupPlayers];
        const temp = playersClone[dragPlayer.current];
        playersClone.splice(dragPlayer.current, 1);
        playersClone.splice(dragOverPlayer.current, 0, temp);
        
        const newTournament = JSON.parse(JSON.stringify(tournament));
        newTournament.groups[groupKey] = playersClone;
        setTournament(newTournament);
    };

    const handleFinalsSort = (finalKey, finalPlayers) => {
        const playersClone = [...finalPlayers];
        const temp = playersClone[dragPlayer.current];
        playersClone.splice(dragPlayer.current, 1);
        playersClone.splice(dragOverPlayer.current, 0, temp);
        
        const newTournament = JSON.parse(JSON.stringify(tournament));
        newTournament.finals[finalKey].players = playersClone;
        setTournament(newTournament);
    };

    const handleConfirmGroups = () => {
        const groupResults = {};
        const finals = {
            championship: { name: "Championship Final (1st-4th)", players: [] },
            silver: { name: "Silver Final (5th-8th)", players: [] },
            bronze: { name: "Bronze Final (9th-12th)", players: [] },
            last: { name: "Last Place Final (13th-14th)", players: [] }
        };

        Object.keys(tournament.groups).forEach(key => {
            const group = tournament.groups[key];
            group.forEach((player, index) => {
                groupResults[player.id] = index + 1; // Store rank
                if (index === 0) finals.championship.players.push(player);
                else if (index === 1) finals.silver.players.push(player);
                else if (index === 2) finals.bronze.players.push(player);
                else if (index === 3) finals.last.players.push(player);
            });
        });

        setTournament({ ...tournament, stage: 'finals', groupResults, finals });
    };
    
    const handleFinish = () => {
        const finalRankings = [];
        const { finals } = tournament;
        
        finals.championship.players.forEach((p, i) => finalRankings[i] = p);
        finals.silver.players.forEach((p, i) => finalRankings[i + 4] = p);
        finals.bronze.players.forEach((p, i) => finalRankings[i + 8] = p);
        finals.last.players.forEach((p, i) => finalRankings[i + 12] = p);

        const maxPoints = finalRankings.length;
        const results = finalRankings.map((p, i) => ({
            id: p.id,
            name: p.name,
            points: maxPoints - i,
            rank: i + 1
        }));
        
        setFinalResults({ gameName: 'Mario Kart Tournament', results, type: 'mariokart' });
    };

    if (finalResults) {
        return <AddPoints players={players} onConfirm={onFinish} onCancel={() => setFinalResults(null)} tournamentResults={finalResults} />
    }

    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-blue-300">Mario Kart Tournament</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition bg-gray-700 px-3 py-1 rounded-md">&larr; Exit</button>
            </div>

            {tournament.stage === 'groups' && (
                <div>
                    <h3 className="text-xl font-bold text-center mb-4 text-yellow-300">Group Stage: Drag to Rank Players</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.keys(tournament.groups).map(key => (
                            <div key={key} className="bg-gray-700 p-4 rounded-lg">
                                <h4 className="font-bold text-center mb-2">Group {key}</h4>
                                <div className="space-y-2">
                                    {tournament.groups[key].map((p, i) => (
                                        <div key={p.id} draggable onDragStart={() => (dragPlayer.current = i)} onDragEnter={() => (dragOverPlayer.current = i)} onDragEnd={() => handleGroupSort(key, tournament.groups[key])} onDragOver={(e) => e.preventDefault()} className="bg-gray-800 p-3 rounded-md cursor-grab active:cursor-grabbing flex items-center gap-4">
                                            <span className="font-bold text-lg text-yellow-400">#{i + 1}</span>
                                            <span>{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 text-center">
                        <button onClick={handleConfirmGroups} className="bg-green-600 text-white font-bold py-3 px-8 rounded-md hover:bg-green-700">Confirm Group Results</button>
                    </div>
                </div>
            )}
            
            {tournament.stage === 'finals' && (
                <div>
                    <h3 className="text-xl font-bold text-center mb-4 text-yellow-300">Finals Stage: Drag to Rank Players</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.keys(tournament.finals).map(key => (
                            <div key={key} className="bg-gray-700 p-4 rounded-lg">
                                <h4 className="font-bold text-center mb-2">{tournament.finals[key].name}</h4>
                                <div className="space-y-2">
                                    {tournament.finals[key].players.map((p, i) => (
                                        <div key={p.id} draggable onDragStart={() => (dragPlayer.current = i)} onDragEnter={() => (dragOverPlayer.current = i)} onDragEnd={() => handleFinalsSort(key, tournament.finals[key].players)} onDragOver={(e) => e.preventDefault()} className="bg-gray-800 p-3 rounded-md cursor-grab active:cursor-grabbing flex items-center gap-4">
                                            <span className="font-bold text-lg text-yellow-400">#{i + 1}</span>
                                            <span>{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 text-center">
                        <button onClick={handleFinish} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-md hover:bg-purple-700">Finish Tournament & Award Points</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function JustFuTournament({ tournament, players, setTournament, onFinish, onCancel }) {
    const [finalResults, setFinalResults] = useState(null);
    const [scores, setScores] = useState(tournament.groupScores || {});

    const handleScoreChange = (playerId, value) => {
        const newScores = { ...scores, [playerId]: parseInt(value, 10) || 0 };
        setScores(newScores);
        setTournament({ ...tournament, groupScores: newScores });
    };
    
    const handleConfirmGroups = () => {
        const allPlayersWithScores = players.map(p => ({ ...p, score: scores[p.id] || 0 }));
        const groupWinners = [];
        const winnerIds = new Set();

        // Find the winner of each group
        Object.values(tournament.groups).forEach(group => {
            if (group.length === 0) return;
            const groupPlayersWithScores = group.map(p => allPlayersWithScores.find(ap => ap.id === p.id)).filter(Boolean);
            if (groupPlayersWithScores.length === 0) return;
            
            groupPlayersWithScores.sort((a, b) => b.score - a.score);
            const winner = groupPlayersWithScores[0];
            groupWinners.push(winner);
            winnerIds.add(winner.id);
        });

        // Find the wild cards from the remaining players
        const remainingPlayers = allPlayersWithScores
            .filter(p => !winnerIds.has(p.id))
            .sort((a, b) => b.score - a.score);

        const wildCards = remainingPlayers.slice(0, 3);
        const wildCardIds = new Set(wildCards.map(p => p.id));

        // Form the championship final
        const championshipFinalists = [...groupWinners, ...wildCards];

        // Find the players for Silver/Bronze finals
        const lowerFinalPlayers = allPlayersWithScores
            .filter(p => !winnerIds.has(p.id) && !wildCardIds.has(p.id))
            .sort((a, b) => b.score - a.score);

        // Form Silver and Bronze finals
        const silverFinalists = lowerFinalPlayers.slice(0, 4);
        const bronzeFinalists = lowerFinalPlayers.slice(4, 8);

        // Construct the new finals object
        const finals = {
            championship: { name: `Championship Final (1st-${championshipFinalists.length}th)`, players: championshipFinalists, scores: {} },
            silver: { name: `Silver Final (${championshipFinalists.length + 1}th-${championshipFinalists.length + silverFinalists.length}th)`, players: silverFinalists, scores: {} },
            bronze: { name: `Bronze Final (${championshipFinalists.length + silverFinalists.length + 1}th-14th)`, players: bronzeFinalists, scores: {} }
        };
        
        // Initialize scores for the finals stage
        players.forEach(p => {
            finals.championship.scores[p.id] = 0;
            finals.silver.scores[p.id] = 0;
            finals.bronze.scores[p.id] = 0;
        });

        setTournament({ ...tournament, stage: 'finals', finals });
    };
    
    const handleFinalScoreChange = (finalKey, playerId, value) => {
        const newTournament = JSON.parse(JSON.stringify(tournament));
        newTournament.finals[finalKey].scores[playerId] = parseInt(value, 10) || 0;
        setTournament(newTournament);
    };

    const handleFinish = () => {
        const { finals } = tournament;
        
        const rankedChampionship = finals.championship.players.map(p => ({...p, score: finals.championship.scores[p.id]})).sort((a,b) => b.score - a.score);
        const rankedSilver = finals.silver.players.map(p => ({...p, score: finals.silver.scores[p.id]})).sort((a,b) => b.score - a.score);
        const rankedBronze = finals.bronze.players.map(p => ({...p, score: finals.bronze.scores[p.id]})).sort((a,b) => b.score - a.score);

        const fullRanking = [...rankedChampionship, ...rankedSilver, ...rankedBronze];
        const maxPoints = fullRanking.length;
        const results = fullRanking.map((p, i) => ({
            id: p.id,
            name: p.name,
            points: maxPoints - i,
            rank: i + 1
        }));
        
        setFinalResults({ gameName: 'Just Fu Tournament', results, type: 'justfu' });
    };

    if (finalResults) {
        return <AddPoints players={players} onConfirm={onFinish} onCancel={() => setFinalResults(null)} tournamentResults={finalResults} />
    }

    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-blue-300">Just Fu Tournament</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition bg-gray-700 px-3 py-1 rounded-md">&larr; Exit</button>
            </div>

            {tournament.stage === 'groups' && (
                <div>
                    <h3 className="text-xl font-bold text-center mb-4 text-yellow-300">Group Stage: Enter Scores</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.keys(tournament.groups).map(key => (
                            <div key={key} className="bg-gray-700 p-4 rounded-lg">
                                <h4 className="font-bold text-center mb-2">Group {key}</h4>
                                <div className="space-y-2">
                                    {tournament.groups[key].map(p => (
                                        <div key={p.id} className="bg-gray-800 p-3 rounded-md flex justify-between items-center">
                                            <span>{p.name}</span>
                                            <input type="number" value={scores[p.id] || ''} onChange={(e) => handleScoreChange(p.id, e.target.value)} className="bg-gray-900 w-20 text-white text-center font-mono rounded-md py-1 px-2 focus:outline-none" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 text-center">
                        <button onClick={handleConfirmGroups} className="bg-green-600 text-white font-bold py-3 px-8 rounded-md hover:bg-green-700">Confirm Group Scores</button>
                    </div>
                </div>
            )}
            
            {tournament.stage === 'finals' && (
                <div>
                    <h3 className="text-xl font-bold text-center mb-4 text-yellow-300">Finals Stage: Enter Scores</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.keys(tournament.finals).map(key => (
                            <div key={key} className="bg-gray-700 p-4 rounded-lg">
                                <h4 className="font-bold text-center mb-2">{tournament.finals[key].name}</h4>
                                <div className="space-y-2">
                                    {tournament.finals[key].players.map(p => (
                                        <div key={p.id} className="bg-gray-800 p-3 rounded-md flex justify-between items-center">
                                            <span>{p.name}</span>
                                            <input type="number" value={tournament.finals[key].scores[p.id] || ''} onChange={(e) => handleFinalScoreChange(key, p.id, e.target.value)} className="bg-gray-900 w-20 text-white text-center font-mono rounded-md py-1 px-2 focus:outline-none" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 text-center">
                        <button onClick={handleFinish} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-md hover:bg-purple-700">Finish Tournament & Award Points</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Main App Component ---
function ScoreboardApp({ roomId, onLeaveRoom, onSignOut, user, db }) {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const [screen, setScreen] = useState('scoreboard');
    const [players, setPlayers] = useState([]);
    const [gameHistory, setGameHistory] = useState([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [tournament, setTournament] = useState(null);
    const [modal, setModal] = useState(null);
    
    const hasPointsAwarded = players.some(p => p.points > 0);

    // --- Firebase & Data Init ---
    useEffect(() => {
        if (!db || !roomId) return;
        console.log(`Setting up listeners for room: ${roomId}`);
        const playersPath = `artifacts/${appId}/public/data/rooms/${roomId}/players`;
        const historyPath = `artifacts/${appId}/public/data/rooms/${roomId}/games`;
        
        const playersQuery = query(collection(db, playersPath));
        const unsubPlayers = onSnapshot(playersQuery, snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.points - a.points);
            setPlayers(data);
        }, (error) => console.error("Player listener error:", error));

        const historyQuery = query(collection(db, historyPath), orderBy('createdAt', 'desc'));
        const unsubHistory = onSnapshot(historyQuery, snap => setGameHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => console.error("History listener error:", error));
        
        return () => { 
            console.log("Cleaning up listeners.");
            unsubPlayers(); 
            unsubHistory(); 
        };
    }, [db, roomId, appId]);

    // --- Player Management ---
    const getPlayersPath = () => `artifacts/${appId}/public/data/rooms/${roomId}/players`;
    const executeAddPlayer = async () => {
        const nameToAdd = newPlayerName.trim();
        if (nameToAdd === '') {
            setModal({ title: 'Invalid Name', message: 'Player name cannot be empty.', onConfirm: () => setModal(null) });
            return;
        }
        if (players.length >= 15) {
            setModal({ title: 'Player Limit Reached', message: 'You can only register a maximum of 15 players.', onConfirm: () => setModal(null) });
            return;
        }
        setNewPlayerName('');
        const newPlayer = { name: nameToAdd, points: 0, createdAt: new Date() };
        try {
            await addDoc(collection(db, getPlayersPath()), newPlayer);
        } catch (error) {
            console.error("Error adding player: ", error);
            setModal({ title: 'Error', message: `Could not save player. Firebase error: ${error.message}`, onConfirm: () => setModal(null) });
            setNewPlayerName(nameToAdd);
        }
    };
    const handleAddPlayer = () => {
        if (hasPointsAwarded) setModal({ title: 'Add New Player?', message: 'Adding a player after points are awarded is fine, but they will start with 0 points.\nContinue?', confirmText: 'Yes, Add', onConfirm: () => { setModal(null); executeAddPlayer(); }, cancelText: 'Cancel', onCancel: () => setModal(null) });
        else executeAddPlayer();
    };
    const executeRemovePlayer = async (playerId) => await deleteDoc(doc(db, getPlayersPath(), playerId));
    const handleRemovePlayer = (playerId) => {
        const p = players.find(p => p.id === playerId);
        if (p && p.points > 0) setModal({ title: 'Remove Player?', message: `Removing ${p.name} is permanent and cannot be undone.\nAre you sure?`, confirmText: 'Yes, Remove', onConfirm: async () => { setModal(null); await executeRemovePlayer(playerId); }, cancelText: 'Cancel', onCancel: () => setModal(null) });
        else executeRemovePlayer(playerId);
    };
    const resetGame = () => setModal({ title: 'Reset Game?', message: 'This will delete all players, points, and history for everyone in this room. This is irreversible.', confirmText: 'Yes, Reset', onConfirm: async () => {
        const pQuery = query(collection(db, getPlayersPath()));
        const gQuery = query(collection(db, `artifacts/${appId}/public/data/rooms/${roomId}/games`));
        const [pSnap, gSnap] = await Promise.all([getDocs(pQuery), getDocs(gQuery)]);
        await Promise.all([...pSnap.docs.map(d => deleteDoc(d.ref)), ...gSnap.docs.map(d => deleteDoc(d.ref))]);
        setScreen('register'); setTournament(null); setModal(null);
    }});

    // --- Points & History Management ---
    const handleAddPointsAndHistory = async (gameResult) => {
        await addDoc(collection(db, `artifacts/${appId}/public/data/rooms/${roomId}/games`), { ...gameResult, createdAt: new Date() });
        for (const result of gameResult.results) {
            const playerRef = doc(db, getPlayersPath(), result.id);
            const player = players.find(p => p.id === result.id);
            if (player) await updateDoc(playerRef, { points: player.points + result.points });
        }
        setTournament(null); setScreen('scoreboard');
    };
    const handleDeleteGame = (gameToDelete) => setModal({ 
        title: 'Delete Game Record?', 
        message: `This will delete "${gameToDelete.gameName}" and subtract points from the scoreboard. This cannot be undone.`, 
        confirmText: 'Yes, Delete', 
        onConfirm: async () => {
            for (const result of gameToDelete.results) {
                const playerRef = doc(db, getPlayersPath(), result.id);
                const player = players.find(p => p.id === result.id);
                if (player) await updateDoc(playerRef, { points: player.points - result.points });
            }
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/rooms/${roomId}/games`, gameToDelete.id));
            setModal(null);
        },
        cancelText: 'Cancel',
        onCancel: () => setModal(null)
    });
    const handleUpdateGameName = async (gameId, newName) => {
        if (!newName.trim()) return;
        const gameDocRef = doc(db, `artifacts/${appId}/public/data/rooms/${roomId}/games`, gameId);
        try {
            await updateDoc(gameDocRef, { gameName: newName.trim() });
        } catch (error) {
            console.error("Error updating game name:", error);
            setModal({ title: 'Error', message: 'Could not update game name.', onConfirm: () => setModal(null) });
        }
    };
    
    // --- Tournament Logic ---
    const getTournamentDisplayName = (type) => {
        if (type === '1v1') return '1v1 Tournament';
        if (type === 'team') return 'Team Based';
        if (type === 'ffa') return 'Free For All';
        if (type === 'mariokart') return 'Mario Kart';
        if (type === 'justfu') return 'Just Fu';
        return 'tournament';
    }

    const createTournament = (type) => {
        const startNew = () => {
            setTournament(null); // Clear old tournament
            if (type === '1v1') create1v1Tournament();
            if (type === 'team') createTeamBasedGame();
            if (type === 'ffa') createFreeForAllGame();
            if (type === 'mariokart') createMarioKartTournament();
            if (type === 'justfu') createJustFuTournament();
        };

        if (tournament && tournament.type !== type) {
            setModal({
                title: 'Start New Tournament?',
                message: `An existing ${getTournamentDisplayName(tournament.type)} tournament is in progress. Starting a new one will delete its progress. Are you sure?`,
                confirmText: 'Yes, Start New',
                onConfirm: () => { setModal(null); startNew(); },
                cancelText: 'Cancel', onCancel: () => setModal(null)
            });
        } else {
            startNew();
        }
    };

    const create1v1Tournament = () => {
        const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
        let pairings = [];
        for (let i = 0; i < sortedPlayers.length; i += 2) {
            if (sortedPlayers[i+1]) {
                pairings.push({ p1: sortedPlayers[i], p2: sortedPlayers[i+1], winner: null, matchId: `R1M${i/2+1}` });
            } else {
                pairings.push({ p1: sortedPlayers[i], p2: { id: 'bye', name: 'BYE' }, winner: sortedPlayers[i].id, matchId: `R1M${i/2+1}` });
            }
        }
        setTournament({ type: '1v1', players: players.map(p => ({ ...p, wins: 0, opponents: [] })), rounds: [{ round: 1, matches: pairings }], status: 'active' });
        setScreen('1v1_tournament');
    };

    const createTeamBasedGame = () => {
        const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
        const teamA = [];
        const teamB = [];
        sortedPlayers.forEach((player, index) => {
            if (index % 2 === 0) {
                teamA.push(player);
            } else {
                teamB.push(player);
            }
        });
        setTournament({ type: 'team', teamA, teamB, scoreA: 0, scoreB: 0, status: 'active' });
        setScreen('team_based_game');
    };

    const createFreeForAllGame = () => {
        const initialScores = {};
        players.forEach(p => {
            initialScores[p.id] = 0;
        });
        setTournament({ 
            type: 'ffa', 
            players: [...players], 
            scores: initialScores, 
            status: 'active' 
        });
        setScreen('free_for_all_game');
    };
    
    const createMarioKartTournament = () => {
        if (players.length !== 14) {
            setModal({ title: 'Incorrect Player Count', message: 'Mario Kart tournament requires exactly 14 players.', onConfirm: () => setModal(null), confirmText: 'OK' });
            return;
        }
        const rankedPlayers = [...players].sort((a, b) => b.points - a.points);
        const groups = { A: [], B: [], C: [], D: [] };
        const groupKeys = ['A', 'B', 'C', 'D'];

        rankedPlayers.forEach((player, index) => {
            const round = Math.floor(index / 4);
            let groupIndex;

            if (round % 2 === 0) { // Forward round (0, 2, 4...)
                groupIndex = index % 4;
            } else { // Reverse round (1, 3, 5...)
                groupIndex = 3 - (index % 4);
            }
            
            groups[groupKeys[groupIndex]].push(player);
        });

        setTournament({ type: 'mariokart', stage: 'groups', groups, groupResults: {}, status: 'active' });
        setScreen('mario_kart_tournament');
    };

    const createJustFuTournament = () => {
         if (players.length !== 14) {
            setModal({ title: 'Incorrect Player Count', message: 'This tournament requires exactly 14 players.', onConfirm: () => setModal(null), confirmText: 'OK' });
            return;
        }
        const rankedPlayers = [...players].sort((a, b) => b.points - a.points);
        const groups = { A: [], B: [], C: [] };
        const groupKeys = ['A', 'B', 'C'];
        
        rankedPlayers.forEach((player, index) => {
             const round = Math.floor(index / 3);
             let groupIndex;
             if (round % 2 === 0) {
                 groupIndex = index % 3;
             } else {
                 groupIndex = 2 - (index % 3);
             }
             if(groups[groupKeys[groupIndex]]) {
                 groups[groupKeys[groupIndex]].push(player);
             }
        });

        const initialScores = {};
        players.forEach(p => { initialScores[p.id] = 0; });

        setTournament({ type: 'justfu', stage: 'groups', groups, groupScores: initialScores, status: 'active' });
        setScreen('just_fu_tournament');
    };

    const handleResume = () => {
        if (!tournament) return;
        if (tournament.type === '1v1') setScreen('1v1_tournament');
        if (tournament.type === 'team') setScreen('team_based_game');
        if (tournament.type === 'ffa') setScreen('free_for_all_game');
        if (tournament.type === 'mariokart') setScreen('mario_kart_tournament');
        if (tournament.type === 'justfu') setScreen('just_fu_tournament');
    };
    
    // --- Rendering ---
    const renderScreen = () => {
        switch (screen) {
            case 'register': return <PlayerRegistration {...{ players, newPlayerName, setNewPlayerName, onAddPlayer: handleAddPlayer, onRemovePlayer: handleRemovePlayer, onStart: () => setScreen('scoreboard') }} />;
            case 'scoreboard': return <Scoreboard {...{ players, onPlay: () => setScreen('play_menu'), onGoToRegister: () => setScreen('register'), onResetGame: resetGame, onShowHistory: () => setScreen('history') }} />;
            case 'play_menu': return <PlayMenu {...{ tournament, players, onCreateTournament: createTournament, onResume: handleResume, onAddPoints: () => setScreen('add_points'), onBack: () => setScreen('scoreboard') }} />;
            case 'add_points': return <AddPoints {...{ players, onConfirm: handleAddPointsAndHistory, onCancel: () => setScreen('play_menu') }} />;
            case 'history': return <GameHistory {...{ history: gameHistory, onBack: () => setScreen('scoreboard'), onDeleteGame: handleDeleteGame, onRenameGame: handleUpdateGameName }} />;
            case '1v1_tournament': return <SwissTournament {...{ tournament, setTournament, players, onFinish: handleAddPointsAndHistory, onCancel: () => setScreen('scoreboard') }} />;
            case 'team_based_game': return <TeamBasedGame {...{ tournament, setTournament, onFinish: handleAddPointsAndHistory, onCancel: () => setScreen('scoreboard') }} />;
            case 'free_for_all_game': return <FreeForAllGame {...{ tournament, setTournament, onFinish: handleAddPointsAndHistory, onCancel: () => setScreen('scoreboard') }} />;
            case 'mario_kart_tournament': return <MarioKartTournament {...{ tournament, players, setTournament, onFinish: handleAddPointsAndHistory, onCancel: () => setScreen('scoreboard') }} />;
            case 'just_fu_tournament': return <JustFuTournament {...{ tournament, players, setTournament, onFinish: handleAddPointsAndHistory, onCancel: () => setScreen('scoreboard') }} />;
            default: return <PlayerRegistration {...{ players, newPlayerName, setNewPlayerName, onAddPlayer: handleAddPlayer, onRemovePlayer: handleRemovePlayer, onStart: () => setScreen('scoreboard') }} />;
        }
    };
    
    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            {modal && <Modal {...modal} />}
            <div className="max-w-full mx-auto">
                <header className="text-center mb-8 relative">
                    <h1 className="text-4xl sm:text-5xl font-bold text-blue-400 tracking-wider"><TrophyIcon /> Akavin games</h1>
                    <p className="text-gray-400 mt-2">AkaGamestudio © v0.1</p>
                    <div className="absolute top-0 right-0 flex items-start gap-4">
                         {user && !user.isAnonymous && (
                             <button onClick={onSignOut} className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 flex items-center">
                                <LogoutIcon /> Sign Out
                             </button>
                         )}
                         <div className="flex flex-col items-center">
                             <button onClick={onLeaveRoom} className="bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 flex items-center">
                                <DoorOpenIcon /> Leave Room
                             </button>
                             <p className="text-xs text-gray-500 mt-1">Room: {roomId}</p>
                         </div>
                    </div>
                </header>
                <main className="bg-gray-800 rounded-xl shadow-2xl p-6">{renderScreen()}</main>
                 <footer className="text-center mt-8 text-gray-500 text-sm">
                    {user && !user.isAnonymous ? <p>Host: {user.displayName}</p> : <p>Guest User</p>}
                </footer>
            </div>
        </div>
    );
}


// --- Root Component ---
export default function App() {
    const [firebaseServices, setFirebaseServices] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [roomId, setRoomId] = useState(null);
    const [isLoadingRoom, setIsLoadingRoom] = useState(true);
    const [modal, setModal] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loginIntent, setLoginIntent] = useState(null); // 'create' or null

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // --- Firebase & Auth Init ---
    useEffect(() => {
        try {
            console.log("Initializing Firebase...");
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const auth = getAuth(app);
            setFirebaseServices({ db: firestore, auth });
            console.log("Firebase initialized successfully.");
        } catch (e) { 
            console.error("CRITICAL: Firebase init failed:", e);
            setModal({ title: 'Initialization Error', message: `Could not connect to services. Error: ${e.message}`, onConfirm: () => setModal(null) });
            setIsAuthReady(true); // Still set to true to prevent infinite loading screen on error
        }
    }, []); // RUN ONLY ONCE

    useEffect(() => {
        if (!firebaseServices) return;
        const unsubscribe = onAuthStateChanged(firebaseServices.auth, (authUser) => {
            console.log("Auth state changed. User:", authUser ? authUser.uid : 'null');
            setUser(authUser);
            setIsAuthReady(true);
            if (authUser && !authUser.isAnonymous && loginIntent === 'create') {
                setShowCreateForm(true);
                setLoginIntent(null);
            } else {
                if (!authUser || authUser.isAnonymous) {
                   setShowCreateForm(false);
                }
            }
        });
        return () => unsubscribe();
    }, [firebaseServices, loginIntent]);
    
    // Check local storage for a saved room ID
    useEffect(() => {
        const savedRoomId = localStorage.getItem('akavin-room-id');
        if (savedRoomId) {
            setRoomId(savedRoomId);
        }
        setIsLoadingRoom(false);
    }, []);

    // --- Room Logic ---
    const handleLogin = async (isCreating = false) => {
        if (!firebaseServices) return;
        if (isCreating) {
            setLoginIntent('create');
        }
        const provider = new GoogleAuthProvider();
        try {
            if (firebaseServices.auth.currentUser && firebaseServices.auth.currentUser.isAnonymous) {
                await signOut(firebaseServices.auth);
            }
            await signInWithPopup(firebaseServices.auth, provider);
        } catch (error) {
            setLoginIntent(null); // Reset intent on error
            console.error("Google sign-in error:", error);
             setModal({
                title: 'Sign-In Error',
                message: `An error occurred: ${error.code}`,
                onConfirm: () => setModal(null)
            });
        }
    };
    
    const handleSignOut = async () => {
        if (!firebaseServices) return;
        await signOut(firebaseServices.auth);
        handleLeaveRoom();
    };

    const handleJoinRoom = async (code) => {
        if (!firebaseServices) return false;
        const roomDocRef = doc(firebaseServices.db, `artifacts/${appId}/public/data/rooms/${code}`);
        try {
            const docSnap = await getDoc(roomDocRef);
            if (docSnap.exists()) {
                localStorage.setItem('akavin-room-id', code);
                setRoomId(code);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error checking room:", error);
            setModal({ title: 'Error', message: `Could not check room. Error: ${error.message}`, onConfirm: () => setModal(null) });
            return false;
        }
    };
    
    const handleCreateRoom = async (code) => {
        if (!firebaseServices || !user || user.isAnonymous) {
            const message = !user ? "No user is signed in." : "Only signed-in users can create rooms.";
            setModal({ title: 'Creation Failed', message, onConfirm: () => setModal(null) });
            return false;
        }
        console.log(`Attempting to create room '${code}' for user ${user.uid}`);
        const roomDocRef = doc(firebaseServices.db, `artifacts/${appId}/public/data/rooms/${code}`);
        try {
            const docSnap = await getDoc(roomDocRef);
            if (docSnap.exists()) {
                setModal({ title: 'Room Exists', message: 'This room code is already taken. Please try another.', onConfirm: () => setModal(null) });
                return false;
            }
            await setDoc(roomDocRef, { 
                createdAt: new Date(),
                createdBy: user.uid,
                creatorName: user.displayName || user.email,
            });
            console.log(`Room '${code}' created successfully.`);
            localStorage.setItem('akavin-room-id', code);
            setRoomId(code);
            return true;
        } catch (error) {
            console.error("FATAL: Error creating room:", error);
            setModal({
                title: 'Database Error',
                message: `Could not create room. Firebase returned the following error:\n\n${error.message}`,
                onConfirm: () => setModal(null)
            });
            return false;
        }
    };

    const handleLeaveRoom = () => {
        localStorage.removeItem('akavin-room-id');
        setRoomId(null);
        setShowCreateForm(false);
    };

    if (!isAuthReady || isLoadingRoom || !firebaseServices) {
        return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center"><p className="text-xl">Loading Services...</p></div>;
    }
    
    if (roomId) {
        return <ScoreboardApp roomId={roomId} onLeaveRoom={handleLeaveRoom} onSignOut={handleSignOut} user={user} db={firebaseServices.db} />;
    }

    return (
         <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
            {modal && <Modal {...modal} />}
            <RoomGate 
                onJoinRoom={handleJoinRoom} 
                onCreateRoom={handleCreateRoom}
                onLogin={handleLogin}
                user={user}
                showCreateForm={showCreateForm}
                onSetShowCreateForm={setShowCreateForm}
            />
         </div>
    );
}
