let currentUser = null;
let userData = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        await loadWithdrawalHistory();
        setupAmountCalculator();
    } else {
        window.location.href = 'index.html';
    }
});

async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            userData = userDoc.data();
            
            document.getElementById('userBalance').textContent = userData.balance + ' PKR';
            document.getElementById('userName').textContent = userData.firstName + ' ' + userData.lastName;
            document.getElementById('withdrawalAmount').max = userData.balance;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function setupAmountCalculator() {
    const amountInput = document.getElementById('withdrawalAmount');
    
    amountInput.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        const fee = amount * 0.03;
        const netAmount = amount - fee;
        
        document.getElementById('showAmount').textContent = amount.toFixed(2);
        document.getElementById('showFee').textContent = fee.toFixed(2);
        document.getElementById('showNetAmount').textContent = netAmount.toFixed(2);
    });
}

async function requestWithdrawal() {
    const method = document.getElementById('withdrawalMethod').value;
    const accountNumber = document.getElementById('accountNumber').value;
    const accountName = document.getElementById('accountName').value;
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    
    // Validation
    if (!method || !accountNumber || !accountName || !amount) {
        alert('Please fill all fields');
        return;
    }
    
    if (amount < 100) {
        alert('Minimum withdrawal amount is 100 PKR');
        return;
    }
    
    if (amount > userData.balance) {
        alert('Insufficient balance');
        return;
    }
    
    // Check if user joined more than 7 days ago
    const joinedDate = userData.joinedDate.toDate();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (joinedDate > sevenDaysAgo && (userData.totalWithdrawals === 0 || !userData.totalWithdrawals)) {
        alert('First withdrawal available after 7 days of registration');
        return;
    }
    
    // Calculate fees
    const fee = amount * 0.03;
    const netAmount = amount - fee;
    
    try {
        // Create withdrawal request
        const withdrawalData = {
            userId: currentUser.uid,
            userEmail: userData.email,
            userName: userData.firstName + ' ' + userData.lastName,
            method: method,
            accountNumber: accountNumber,
            accountName: accountName,
            amount: amount,
            fee: fee,
            netAmount: netAmount,
            status: 'pending',
            requestDate: new Date(),
            processedDate: null
        };
        
        // Save withdrawal request to Firestore
        await db.collection('withdrawal_requests').add(withdrawalData);
        
        // Update user balance
        await db.collection('users').doc(currentUser.uid).update({
            balance: firebase.firestore.FieldValue.increment(-amount),
            totalWithdrawals: firebase.firestore.FieldValue.increment(amount)
        });
        
        // Send notification
        await db.collection('notifications').add({
            type: 'withdrawal_request',
            userId: currentUser.uid,
            userName: withdrawalData.userName,
            userEmail: withdrawalData.userEmail,
            amount: amount,
            netAmount: netAmount,
            method: method,
            accountNumber: accountNumber,
            accountName: accountName,
            timestamp: new Date(),
            message: `Withdrawal Request: ${withdrawalData.userName} - ${amount} PKR via ${method}`
        });

        alert('? Withdrawal request submitted successfully!\n\nYou will receive: ' + netAmount.toFixed(2) + ' PKR\nProcessing time: 24-48 hours');
        
        // Reset form
        document.getElementById('withdrawalMethod').value = '';
        document.getElementById('accountNumber').value = '';
        document.getElementById('accountName').value = '';
        document.getElementById('withdrawalAmount').value = '';
        
        // Reload data
        await loadUserData();
        await loadWithdrawalHistory();
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        alert('Error submitting withdrawal request: ' + error.message);
    }
}

async function loadWithdrawalHistory() {
    try {
        const snapshot = await db.collection('withdrawal_requests')
            .where('userId', '==', currentUser.uid)
            .orderBy('requestDate', 'desc')
            .get();
        
        const historyContainer = document.getElementById('withdrawalHistory');
        
        if (snapshot.empty) {
            historyContainer.innerHTML = '<p>No withdrawal history found.</p>';
            return;
        }
        
        let historyHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.requestDate.toDate().toLocaleDateString();
            const status = data.status === 'pending' ? '? Pending' : '? Paid';
            
            historyHTML += `
                <div class="history-item">
                    <div class="history-amount">${data.amount} PKR</div>
                    <div class="history-method">${data.method}</div>
                    <div class="history-date">${date}</div>
                    <div class="history-status">${status}</div>
                </div>
            `;
        });
        
        historyContainer.innerHTML = historyHTML;
        
    } catch (error) {
        console.error('Error loading withdrawal history:', error);
        historyContainer.innerHTML = '<p>Error loading history</p>';
    }
}