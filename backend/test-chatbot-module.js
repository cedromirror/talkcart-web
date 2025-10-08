const chatbotRoutes = require('./routes/chatbot');

console.log('Chatbot routes loaded:', !!chatbotRoutes);

// Check if the health route is defined
console.log('Chatbot routes keys:', Object.keys(chatbotRoutes));

// Check if it's an express router
console.log('Is express router:', typeof chatbotRoutes.get === 'function');

// List all routes
if (chatbotRoutes.stack) {
  console.log('Defined routes:');
  chatbotRoutes.stack.forEach((route, i) => {
    if (route.route) {
      console.log(`  ${i}: ${route.route.methods} ${route.route.path}`);
    }
  });
}