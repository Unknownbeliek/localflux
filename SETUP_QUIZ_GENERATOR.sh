#!/bin/bash

# Installation & Setup Guide for Auto Quiz Generator

echo "🚀 Setting up Auto Quiz Generator..."
echo ""

# Step 1: Install dependencies
echo "📦 Installing server dependencies..."
cd server
npm install axios
cd ..

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎯 To use the feature:"
echo ""
echo "1. Start the server:"
echo "   cd server && npm start"
echo ""
echo "2. Start the client:"
echo "   cd client && npm run dev"
echo ""
echo "3. Navigate to Deck Studio"
echo ""
echo "4. Click '⚡ Generate from Topic' button"
echo ""
echo "5. Choose one of three modes:"
echo "   • Quick Generate: Type a topic name"
echo "   • Pre-made Decks: Browse curated decks"
echo "   • Upload CSV: Paste your own questions"
echo ""
echo "📚 Documentation:"
echo "   See docs/guide/auto-quiz-generator.md"
echo ""
echo "🔌 Available API Endpoints:"
echo "   • POST /api/quiz/generate"
echo "   • GET /api/quiz/categories"
echo "   • GET /api/quiz/predefined"
echo "   • POST /api/quiz/load-predefined"
echo "   • POST /api/quiz/from-csv"
echo ""
echo "Happy generating! 🎉"
