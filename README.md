# Friday Email Assistant Clone

A modern AI-powered email assistant that helps you manage your inbox efficiently. This clone demonstrates the core functionality of Friday, including:

- Email categorization and prioritization
- AI-powered email analysis
- Automated response suggestions
- Smart email actions
- Clean, modern interface

## Features

- 📧 Connect to Gmail (other providers coming soon)
- 🤖 AI-powered email analysis
- 📝 Smart response suggestions
- 🏷️ Automatic email categorization
- ⚡ Quick actions (reply, archive, delete)
- 🎯 Priority inbox

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- OpenAI GPT-4
- Gmail API
- NextAuth.js (coming soon)

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/friday-clone.git
cd friday-clone
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# Gmail
GMAIL_ACCESS_TOKEN=your_gmail_access_token
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Setting Up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Gmail API
4. Configure the OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URIs
7. Copy the client ID and client secret to your `.env.local` file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this code for your own projects!
