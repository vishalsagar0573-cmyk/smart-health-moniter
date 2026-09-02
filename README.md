# Health Monitor - Village Health Reporting System

A comprehensive health monitoring system for villages, enabling villagers to report health issues and health workers to monitor and provide advice.

## Project Structure

```
health monitor/
├── backend/                    # All backend services
│   ├── ml/                     # Machine Learning
│   │   ├── create_dataset.py   # Dataset generation
│   │   ├── preprocess_dataset.py  # Data preprocessing
│   │   ├── train_model.py      # Model training
│   │   └── requirements.txt    # Python dependencies
│   ├── opencv/                 # OpenCV Water Quality Analysis
│   │   ├── opencv_analyzer.py  # Main OpenCV service
│   │   ├── requirements.txt    # Python dependencies
│   │   ├── start.bat           # Windows startup script
│   │   ├── start.sh            # Linux/Mac startup script
│   │   └── README.md           # OpenCV documentation
│   └── README.md               # Backend overview
├── frontend/                   # React frontend application
│   ├── components/             # React components
│   ├── pages/                  # Page components
│   ├── hooks/                  # Custom React hooks
│   ├── integrations/           # External integrations (Supabase)
│   ├── lib/                    # Utility libraries
│   ├── utils/                  # Helper utilities
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── supabase/                   # Supabase infrastructure
│   ├── functions/              # Edge Functions (TypeScript/Deno)
│   │   ├── analyze-water-image/  # Water image analysis API
│   │   ├── predict-disease/      # Disease prediction API
│   │   ├── predict-risk/         # Risk assessment API
│   │   └── fetch-water-quality-data/  # Water quality data API
│   └── migrations/             # Database migrations
└── [root config files]        # Vite, TypeScript, package.json, etc.
```

## Features

- **Villager Dashboard**: Report health issues with symptoms, location, and water sample images
- **Health Worker Dashboard**: View all reports, analyze trends, and provide safety advice
- **AI-Powered Image Validation**: Validates water sample images using Google Gemini AI
- **OpenCV Water Analysis**: Analyzes water quality (pH, turbidity) using computer vision
- **ML Disease Prediction**: Predicts diseases based on symptoms using Random Forest classifier
- **Risk Assessment**: Evaluates health risk levels based on symptoms and water quality
- **Interactive Maps**: Visualize report locations using Mapbox
- **Trend Analysis**: Analyze health patterns with charts and statistics

## Technologies

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI component library
- **React Router** - Routing
- **Recharts** - Data visualization
- **Mapbox GL** - Interactive maps

### Backend
- **Supabase** - Backend-as-a-Service (Database, Auth, Storage, Edge Functions)
- **Python** - ML and OpenCV services
- **OpenCV** - Computer vision for water quality analysis
- **scikit-learn** - Machine learning models
- **Flask** - OpenCV service web framework

### AI/ML
- **Google Gemini 2.5 Flash** - Image validation and analysis
- **Random Forest Classifier** - Disease prediction
- **Feature Engineering** - Symptom co-occurrence, intensity scores

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Supabase account and project

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:8080`

Create a `.env.local` (or `.env`) file in the project root with your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these values, registration and login will fail with “Failed to fetch”.

### Backend Setup

#### ML Backend

```bash
cd backend/ml
pip install -r requirements.txt

# Generate dataset
python create_dataset.py

# Train model
python train_model.py dataset.csv
```

#### OpenCV Backend

```bash
cd backend/opencv
pip install -r requirements.txt

# Start service
python opencv_analyzer.py
# Or use: start.bat (Windows) or ./start.sh (Linux/Mac)
```

The OpenCV service will run on `http://localhost:8000`

### Supabase Setup

1. Create a Supabase project
2. Run migrations:
   ```bash
   supabase db push
   ```
3. Set environment variables:
   ```bash
   supabase secrets set OPENCV_SERVICE_URL=http://localhost:8000
   supabase secrets set LOVABLE_API_KEY=your_api_key
   ```
4. Deploy Edge Functions:
   ```bash
   supabase functions deploy analyze-water-image
   supabase functions deploy predict-disease
   supabase functions deploy predict-risk
   ```

## Project Organization

### Backend (`backend/`)
All backend services are organized here:
- **`ml/`**: Machine learning models and training scripts
- **`opencv/`**: OpenCV water quality analysis service

### Frontend (`frontend/`)
React application with modern UI:
- Component-based architecture
- TypeScript for type safety
- Tailwind CSS for styling
- Shadcn/ui components

### Supabase (`supabase/`)
Infrastructure and serverless functions:
- Edge Functions for API endpoints
- Database migrations
- Row Level Security policies

## Documentation

- **Backend Overview**: See `backend/README.md`
- **ML Documentation**: See `backend/ml/README.md`
- **OpenCV Documentation**: See `backend/opencv/README.md`

## Development

### Running Locally

1. Start Supabase locally (if using local development):
   ```bash
   supabase start
   ```

2. Start OpenCV service:
   ```bash
   cd backend/opencv
   python opencv_analyzer.py
   ```

3. Start frontend:
   ```bash
   npm run dev
   ```

### Building for Production

```bash
# Build frontend
npm run build

# Deploy Supabase functions
supabase functions deploy
```

## Deployment

- **Frontend**: Deploy via Lovable or any static hosting (Vercel, Netlify, etc.)
- **Backend Services**: Deploy OpenCV service to cloud platform (Heroku, Railway, Render, etc.)
- **Supabase**: Hosted service with Edge Functions

## License

This project is part of the Health Monitor system.


## Important Setup Notes

### Environment Variables
Your `.env.local` file should contain:
```bash
VITE_SUPABASE_URL=https://usynxptupskoeceomjky.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Critical:**
- No quotes around values
- Restart dev server after changing `.env.local`
- Clear browser cache if issues persist

### Troubleshooting
If you encounter "Invalid API Key" or login/registration errors:
1. See `SETUP_GUIDE.md` for complete setup instructions
2. See `TROUBLESHOOTING.md` for common issues and solutions
3. Run `node verify-supabase.js` to test your Supabase connection
4. Check browser console (F12) for detailed error messages

### Quick Test
To verify your Supabase setup is working:
```bash
node verify-supabase.js
```

Expected output: `✅ All tests passed!`
