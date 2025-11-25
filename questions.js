let currentUser = null;
let currentQuestionIndex = 0;
let selectedOption = null;
let timeLeft = 10;
let timerInterval;
let totalEarned = 0;

const questions = [
    { question: "What is the capital of Pakistan?", options: ["Islamabad", "Karachi", "Lahore", "Peshawar"], correct: 0, reward: 50 },
    { question: "Which river flows through Lahore?", options: ["Indus", "Ravi", "Chenab", "Sutlej"], correct: 1, reward: 50 },
    { question: "What is the national language of Pakistan?", options: ["English", "Punjabi", "Urdu", "Sindhi"], correct: 2, reward: 50 },
    { question: "Who is the founder of Pakistan?", options: ["Allama Iqbal", "Quaid-e-Azam", "Liaquat Ali Khan", "Sir Syed Ahmed"], correct: 1, reward: 50 },
    { question: "Which city is called City of Lights?", options: ["Islamabad", "Karachi", "Lahore", "Rawalpindi"], correct: 1, reward: 50 },
    { question: "What is the currency of Pakistan?", options: ["Rupee", "Taka", "Rial", "Dinar"], correct: 0, reward: 50 },
    { question: "Which mountain is in Pakistan?", options: ["Mount Everest", "K2", "Mount Fuji", "Kanchenjunga"], correct: 1, reward: 50 },
    { question: "When Pakistan came into being?", options: ["1940", "1947", "1950", "1935"], correct: 1, reward: 50 },
    { question: "Which sport is most popular in Pakistan?", options: ["Football", "Cricket", "Hockey", "Tennis"], correct: 1, reward: 50 },
    { question: "What is the national flower of Pakistan?", options: ["Rose", "Jasmine", "Sunflower", "Tulip"], correct: 1, reward: 50 }
];

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        showNextQuestion();
    } else {
        window.location.href = 'index.html';
    }
});

async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('userBalance').textContent = userData.balance + ' PKR';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function showNextQuestion() {
    if (currentQuestionIndex >= questions.length) {
        document.getElementById('questionText').textContent = "?? All questions completed! You earned 1000 PKR!";
        document.getElementById('optionsContainer').innerHTML = "";
        document.getElementById('submitBtn').style.display = "none";
        return;
    }

    const question = questions[currentQuestionIndex];
    document.getElementById('questionText').textContent = question.question;
    document.getElementById('currentQ').textContent = currentQuestionIndex + 1;
    
    const optionsHtml = question.options.map((option, index) => 
        `<div class="option" onclick="selectOption(${index})">${option}</div>`
    ).join('');
    
    document.getElementById('optionsContainer').innerHTML = optionsHtml;
    
    selectedOption = null;
    document.getElementById('submitBtn').disabled = true;
    startTimer();
}

function startTimer() {
    timeLeft = 10;
    document.getElementById('timer').textContent = timeLeft;
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showCorrectAnswer();
            setTimeout(() => {
                currentQuestionIndex++;
                setTimeout(showNextQuestion, 2000);
            }, 2000);
        }
    }, 1000);
}

function selectOption(optionIndex) {
    selectedOption = optionIndex;
    document.getElementById('submitBtn').disabled = false;
    
    const options = document.querySelectorAll('.option');
    options.forEach((opt, index) => {
        if (index === optionIndex) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

async function submitAnswer() {
    clearInterval(timerInterval);
    
    const question = questions[currentQuestionIndex];
    const isCorrect = (selectedOption === question.correct);
    
    await db.collection('user_answers').add({
        userId: currentUser.uid,
        questionIndex: currentQuestionIndex,
        selectedOption: selectedOption,
        isCorrect: isCorrect,
        reward: isCorrect ? question.reward : 0,
        timestamp: new Date()
    });

    if (isCorrect) {
        await updateUserBalance(question.reward);
        totalEarned += question.reward;
        document.getElementById('earnedSoFar').textContent = totalEarned;
        alert('? Correct! You earned 50 PKR');
    } else {
        alert('? Wrong answer!');
    }

    // Show ads after each question
    if (typeof adManager !== 'undefined') {
        adManager.showQuadAds();
    }
    
    currentQuestionIndex++;
    setTimeout(showNextQuestion, 3000);
}

function showCorrectAnswer() {
    const correctIndex = questions[currentQuestionIndex].correct;
    const options = document.querySelectorAll('.option');
    options[correctIndex].style.borderColor = '#28a745';
    options[correctIndex].style.background = '#d4edda';
}

async function updateUserBalance(amount) {
    const userRef = db.collection('users').doc(currentUser.uid);
    
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const currentBalance = userDoc.data().balance || 0;
        const newBalance = currentBalance + amount;
        
        transaction.update(userRef, {
            balance: newBalance,
            todayEarnings: (userDoc.data().todayEarnings || 0) + amount,
            totalEarnings: (userDoc.data().totalEarnings || 0) + amount,
            questionsAnswered: (userDoc.data().questionsAnswered || 0) + 1,
            lastActive: new Date()
        });
    });

    loadUserData();
}