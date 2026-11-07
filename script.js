// --- GAME STATE VARIABLES ---
let questions = [];
let currentQIndex = 0;
let ropeStep = 0; // -5 (Red max win) to +5 (Blue max win)
let redScore = 0;
let blueScore = 0;
let redLocked = false;
let blueLocked = false;
let questionAnswered = false;
let soundEnabled = true;

// --- WEB AUDIO SYNTHESIZER ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioCtx();
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.setValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'pull') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'win') {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            const noteOsc = audioCtx.createOscillator();
            const noteGain = audioCtx.createGain();
            noteOsc.connect(noteGain);
            noteGain.connect(audioCtx.destination);
            noteOsc.type = 'triangle';
            noteOsc.frequency.setValueAtTime(freq, now + idx * 0.12);
            noteGain.gain.setValueAtTime(0.3, now + idx * 0.12);
            noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.4);
            noteOsc.start(now + idx * 0.12);
            noteOsc.stop(now + idx * 0.12 + 0.4);
        });
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('sound-icon').innerText = soundEnabled ? '🔊' : '🔇';
}

// --- INITIALIZE GAME ---
window.onload = async function() {
    await loadQuestionsData();
    updateRopePosition();
};

// --- FETCH QUESTIONS JSON ---
async function loadQuestionsData() {
    try {
        const response = await fetch('questions.json');
        questions = await response.json();
        loadQuestion();
    } catch (error) {
        console.error("Error loading questions.json:", error);
    }
}

// --- LOAD QUESTION ---
function loadQuestion() {
    if (currentQIndex >= questions.length) {
        endGame();
        return;
    }
    const q = questions[currentQIndex];
    
    redLocked = false;
    blueLocked = false;
    questionAnswered = false;

    document.getElementById('question-progress').innerText = `${currentQIndex + 1} / ${questions.length}`;
    document.getElementById('question-category').innerText = `Category: ${q.category}`;
    document.getElementById('question-emoji').innerText = q.emoji;
    document.getElementById('question-text').innerText = q.question;

    const toast = document.getElementById('feedback-toast');
    toast.className = 'hidden';

    document.getElementById('red-status').innerText = 'READY';
    document.getElementById('red-status').className = 'text-xs font-extrabold bg-red-500/20 text-red-300 px-2.5 py-1 rounded-md border border-red-500/30';
    document.getElementById('blue-status').innerText = 'READY';
    document.getElementById('blue-status').className = 'text-xs font-extrabold bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md border border-blue-500/30';

    document.getElementById('red-panel').classList.remove('locked-out');
    document.getElementById('blue-panel').classList.remove('locked-out');

    const redOptTexts = document.querySelectorAll('.red-opt-text');
    const blueOptTexts = document.querySelectorAll('.blue-opt-text');
    const redButtons = document.querySelectorAll('.btn-red-opt');
    const blueButtons = document.querySelectorAll('.btn-blue-opt');

    q.options.forEach((opt, idx) => {
        redOptTexts[idx].innerText = opt;
        blueOptTexts[idx].innerText = opt;
        redButtons[idx].className = 'btn-red-opt btn-touch w-full bg-slate-900 hover:bg-red-900/60 border-2 border-red-500/40 hover:border-red-400 text-white font-bold p-3.5 rounded-xl flex items-center space-x-3 shadow-md text-left';
        blueButtons[idx].className = 'btn-blue-opt btn-touch w-full bg-slate-900 hover:bg-blue-900/60 border-2 border-blue-500/40 hover:border-blue-400 text-white font-bold p-3.5 rounded-xl flex items-center justify-between shadow-md text-right';
    });
}

// --- ANSWER HANDLING ---
function handleAnswer(team, selectedIdx) {
    initAudio();
    if (questionAnswered) return;

    if (team === 'red' && redLocked) return;
    if (team === 'blue' && blueLocked) return;

    const currentQ = questions[currentQIndex];
    const isCorrect = (selectedIdx === currentQ.answer);

    if (isCorrect) {
        questionAnswered = true;
        playSound('correct');
        playSound('pull');

        const toast = document.getElementById('feedback-toast');
        toast.className = `block text-xs font-black px-4 py-1.5 rounded-lg border uppercase tracking-wider text-white ${team === 'red' ? 'bg-red-600 border-red-400' : 'bg-blue-600 border-blue-400'}`;
        toast.innerText = `🎯 TEAM ${team.toUpperCase()} SCORED!`;

        if (team === 'red') {
            const btns = document.querySelectorAll('.btn-red-opt');
            btns[selectedIdx].className = 'btn-red-opt btn-touch w-full bg-emerald-600 border-2 border-emerald-300 text-white font-bold p-3.5 rounded-xl flex items-center space-x-3 shadow-lg text-left';
            redScore++;
            ropeStep--;
            animatePull('red');
        } else {
            const btns = document.querySelectorAll('.btn-blue-opt');
            btns[selectedIdx].className = 'btn-blue-opt btn-touch w-full bg-emerald-600 border-2 border-emerald-300 text-white font-bold p-3.5 rounded-xl flex items-center justify-between shadow-lg text-right';
            blueScore++;
            ropeStep++;
            animatePull('blue');
        }

        updateScores();
        updateRopePosition();

        setTimeout(() => {
            currentQIndex++;
            loadQuestion();
        }, 1400);

    } else {
        playSound('wrong');

        if (team === 'red') {
            redLocked = true;
            document.getElementById('red-status').innerText = 'LOCKED ❌';
            document.getElementById('red-status').className = 'text-xs font-extrabold bg-red-950 text-red-400 px-2.5 py-1 rounded-md border border-red-600/50';
            document.getElementById('red-panel').classList.add('locked-out');
            const btns = document.querySelectorAll('.btn-red-opt');
            btns[selectedIdx].className = 'btn-red-opt btn-touch w-full bg-rose-950 border-2 border-rose-600 text-rose-300 font-bold p-3.5 rounded-xl flex items-center space-x-3 text-left';
        } else {
            blueLocked = true;
            document.getElementById('blue-status').innerText = 'LOCKED ❌';
            document.getElementById('blue-status').className = 'text-xs font-extrabold bg-blue-950 text-blue-400 px-2.5 py-1 rounded-md border border-blue-600/50';
            document.getElementById('blue-panel').classList.add('locked-out');
            const btns = document.querySelectorAll('.btn-blue-opt');
            btns[selectedIdx].className = 'btn-blue-opt btn-touch w-full bg-rose-950 border-2 border-rose-600 text-rose-300 font-bold p-3.5 rounded-xl flex items-center justify-between text-right';
        }

        if (redLocked && blueLocked) {
            const toast = document.getElementById('feedback-toast');
            toast.className = 'block bg-amber-600 border border-amber-300 text-white text-xs font-black px-4 py-1.5 rounded-lg uppercase tracking-wider';
            toast.innerText = `❌ BOTH INCORRECT! Answer: ${currentQ.options[currentQ.answer]}`;

            setTimeout(() => {
                currentQIndex++;
                loadQuestion();
            }, 1800);
        }
    }
}

// --- UPDATE SCORES UI ---
function updateScores() {
    document.getElementById('red-score').innerText = redScore;
    document.getElementById('blue-score').innerText = blueScore;
}

// --- UPDATE ROPE VISUAL POSITION ---
function updateRopePosition() {
    const ropeStage = document.getElementById('rope-stage');
    const badge = document.getElementById('position-badge');

    const shiftPx = ropeStep * 45;
    ropeStage.style.transform = `translateX(${shiftPx}px)`;

    if (ropeStep === 0) {
        badge.innerText = "NEUTRAL ZONE";
        badge.className = "bg-slate-800/90 text-amber-400 text-xs font-extrabold px-4 py-1 rounded-full border border-slate-700 uppercase tracking-widest shadow";
    } else if (ropeStep < 0) {
        badge.innerText = `RED LEADING (+${Math.abs(ropeStep)})`;
        badge.className = "bg-red-950/90 text-red-400 text-xs font-extrabold px-4 py-1 rounded-full border border-red-700 uppercase tracking-widest shadow";
    } else {
        badge.innerText = `BLUE LEADING (+${ropeStep})`;
        badge.className = "bg-blue-950/90 text-blue-400 text-xs font-extrabold px-4 py-1 rounded-full border border-blue-700 uppercase tracking-widest shadow";
    }
}

// --- ANIMATE CHARACTERS ON PULL ---
function animatePull(winningTeam) {
    const redTeamSvg = document.getElementById('red-team-svg');
    const blueTeamSvg = document.getElementById('blue-team-svg');

    if (winningTeam === 'red') {
        redTeamSvg.classList.add('pull-left');
        setTimeout(() => redTeamSvg.classList.remove('pull-left'), 400);
    } else {
        blueTeamSvg.classList.add('pull-right');
        setTimeout(() => blueTeamSvg.classList.remove('pull-right'), 400);
    }
}

// --- END GAME & WINNER MODAL ---
function endGame() {
    playSound('win');
    startConfetti();

    const modal = document.getElementById('victory-modal');
    const winnerTitle = document.getElementById('winner-title');
    const winnerDesc = document.getElementById('winner-desc');
    const winnerTrophy = document.getElementById('winner-trophy');

    document.getElementById('final-red-score').innerText = redScore;
    document.getElementById('final-blue-score').innerText = blueScore;

    if (ropeStep < 0 || (ropeStep === 0 && redScore > blueScore)) {
        winnerTrophy.innerText = '🔴🏆';
        winnerTitle.innerText = "TEAM RED WINS!";
        winnerTitle.className = "text-3xl md:text-4xl font-black text-red-500 mb-2 uppercase";
        winnerDesc.innerText = `Team Red pulled the rope to victory with ${redScore} points!`;
    } else if (ropeStep > 0 || (ropeStep === 0 && blueScore > redScore)) {
        winnerTrophy.innerText = '🔵🏆';
        winnerTitle.innerText = "TEAM BLUE WINS!";
        winnerTitle.className = "text-3xl md:text-4xl font-black text-blue-500 mb-2 uppercase";
        winnerDesc.innerText = `Team Blue pulled the rope to victory with ${blueScore} points!`;
    } else {
        winnerTrophy.innerText = '🤝🏆';
        winnerTitle.innerText = "IT'S A DRAW!";
        winnerTitle.className = "text-3xl md:text-4xl font-black text-amber-400 mb-2 uppercase";
        winnerDesc.innerText = `Both teams fought hard with equal scores!`;
    }

    modal.classList.remove('hidden');
}

// --- RESET GAME ---
function resetGame() {
    currentQIndex = 0;
    ropeStep = 0;
    redScore = 0;
    blueScore = 0;
    stopConfetti();
    document.getElementById('victory-modal').classList.add('hidden');
    updateScores();
    updateRopePosition();
    loadQuestion();
}

// --- SIMPLE CANVAS CONFETTI EFFECT ---
let confettiInterval;
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#ec4899'];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 4,
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1
        });
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y > canvas.height) p.y = -10;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    confettiInterval = setInterval(render, 1000 / 60);
}

function stopConfetti() {
    clearInterval(confettiInterval);
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
