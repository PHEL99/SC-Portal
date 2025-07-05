(function() {
  function initChatbot() {
    const widget = document.getElementById('chatbot-widget');
    const fab = document.getElementById('chatbot-fab');
    const close = document.getElementById('chatbot-close');
    const messages = document.getElementById('chatbot-messages');
    const form = document.getElementById('chatbot-form');
    const input = document.getElementById('chatbot-input');
    if (!widget || !fab || !close || !messages || !form || !input) return;
    function show() { widget.style.display = 'flex'; fab.style.display = 'none'; }
    function hide() { widget.style.display = 'none'; fab.style.display = 'block'; }
    fab.onclick = show; close.onclick = hide;
    form.onsubmit = async function(e) {
      e.preventDefault();
      const userMsg = input.value.trim();
      if (!userMsg) return;
      appendMessage('user', userMsg);
      input.value = '';
      appendMessage('bot', '...');
      const resp = await fetch('/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await resp.json();
      // Fix: preserve line breaks in bot reply
      messages.lastChild.innerHTML = (data.reply || 'Sorry, I could not answer.').replace(/\n/g, '<br>');
    };
    function appendMessage(sender, message) {
      const chatBox = document.getElementById('chatbot-messages');
      const messageElem = document.createElement('div');
      messageElem.className = sender === 'user' ? 'user-message' : 'bot-message';
      // Replace \n with <br> for HTML line breaks
      messageElem.innerHTML = message.replace(/\n/g, '<br>');
      chatBox.appendChild(messageElem);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  // If widget is not present, load it and then initialize
  if (!document.getElementById('chatbot-widget')) {
    fetch('/static/chatbot.html').then(r => r.text()).then(html => {
      const div = document.createElement('div');
      div.innerHTML = html;
      document.body.appendChild(div);
      setTimeout(initChatbot, 100); // Wait for DOM
    });
  } else {
    initChatbot();
  }
})(); 