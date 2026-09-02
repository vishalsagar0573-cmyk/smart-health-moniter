# 🌊 AI-Based Early Warning System for Water-Borne Diseases

### AI-Powered Health Monitoring, Water Quality Analysis & Disease Risk Prediction

The **AI-Based Early Warning System for Water-Borne Diseases** is a comprehensive village health monitoring platform designed to help identify potential water-borne disease risks at an early stage.

The system enables villagers to report health issues, symptoms, locations, and water sample images. Health workers can monitor these reports, analyze health trends, evaluate water quality, predict potential diseases, assess risk levels, and provide safety recommendations.

The platform combines **Artificial Intelligence, Machine Learning, Computer Vision, and real-time data analysis** into a unified health monitoring system.

---

## ❗ Problem Statement

Water-borne diseases remain a significant health concern in rural and village communities, where access to timely healthcare, water-quality monitoring, and early disease detection can be limited.

Traditional health monitoring methods often depend on manual reporting and delayed analysis, making it difficult for health workers to identify emerging health risks and potential disease patterns at an early stage.

### Major Challenges

- Limited monitoring of water quality in rural areas
- Delayed reporting of health issues
- Difficulty in identifying potential water-borne diseases from symptoms
- Lack of centralized health and water-quality information
- Limited tools for identifying high-risk areas
- Difficulty in analyzing health trends and patterns

To address these challenges, this system combines health reporting, water-quality image analysis, machine-learning-based disease prediction, risk assessment, and interactive visualization into a single platform.

The system is designed to help health workers **monitor health conditions, identify potential risks earlier, analyze trends, and provide timely safety recommendations**.

---

## 🎯 Objectives

The main objectives of the system are:

- To provide a digital platform for village health reporting
- To analyze water sample images using AI and computer vision
- To predict potential diseases based on reported symptoms
- To assess health risks using symptoms and water-quality information
- To provide health workers with a centralized monitoring dashboard
- To visualize reported cases geographically
- To identify health trends and patterns
- To support early identification of potential water-borne disease risks

---

## ✨ Key Features

### 🏥 Villager Health Reporting

Allows villagers to submit health reports containing:

- Symptoms
- Symptom information
- Location
- Water sample images
- Other relevant health information

### 👨‍⚕️ Health Worker Dashboard

Health workers can:

- View submitted health reports
- Monitor reported cases
- Analyze health trends
- Review risk assessments
- Provide safety advice
- Monitor geographical patterns

### 🤖 AI-Powered Image Validation

Uploaded water sample images are validated and analyzed using **Google Gemini 2.5 Flash** before further processing.

### 💧 OpenCV Water Quality Analysis

The system uses **OpenCV** for computer-vision-based water analysis, including characteristics such as:

- pH
- Turbidity
- Visual water characteristics

### 🧠 ML Disease Prediction

A **Random Forest Classifier** analyzes reported symptoms and predicts potential diseases.

### ⚠️ Risk Assessment

The system evaluates health risk levels using information such as:

- Reported symptoms
- Symptom intensity
- Water-quality information

### 🗺️ Interactive Maps

Reported health issues can be visualized geographically using **Mapbox GL**.

### 📊 Trend Analysis

Health workers can analyze health patterns using:

- Charts
- Statistics
- Report trends
- Geographical information

### 🔐 Authentication & Data Management

**Supabase** provides:

- Authentication
- Database
- Storage
- Edge Functions
- Row Level Security

---

## 🔄 System Workflow

```text
                    Villager
                       │
                       ↓
             Health Issue Report
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        Symptoms              Location
             │                   │
             └─────────┬─────────┘
                       ↓
              Water Sample Image
                       │
                       ↓
             AI Image Validation
              (Google Gemini)
                       │
                       ↓
              OpenCV Water Analysis
                       │
                       ↓
              ┌────────┴─────────┐
              ↓                  ↓
       Disease Prediction    Risk Assessment
       (Random Forest)       (Health + Water)
              │                  │
              └────────┬─────────┘
                       ↓
                Analysis Results
                       │
                       ↓
            Health Worker Dashboard
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       Reports       Trends       Maps
          │            │            │
          └────────────┼────────────┘
                       ↓
                Safety Advice
```

---

## 🛠️ Technologies Used

### Frontend

- **React** – User interface development
- **TypeScript** – Type-safe application development
- **Tailwind CSS** – Responsive and modern styling
- **Shadcn/ui** – UI component library
- **React Router** – Application routing
- **Recharts** – Data visualization and charts
- **Mapbox GL** – Interactive geographical maps

### Backend

- **Supabase** – Backend-as-a-Service
- **Python** – Machine learning and computer vision services
- **Flask** – Web framework for the OpenCV service
- **OpenCV** – Computer vision and water-quality analysis

### AI / Machine Learning

- **Google Gemini 2.5 Flash** – Image validation and analysis
- **Scikit-learn** – Machine learning implementation
- **Random Forest Classifier** – Disease prediction
- **Feature Engineering** – Symptom co-occurrence and intensity-based features

### Database & Cloud

- **PostgreSQL / Supabase** – Data storage
- **Supabase Edge Functions** – Serverless API functions
- **Supabase Storage** – Image and file storage
- **Supabase Authentication** – User authentication

---

## 🤖 AI / ML Methodology

### 1. Water Image Validation

When a villager uploads a water sample image, the image is validated using **Google Gemini 2.5 Flash**.

```text
Water Sample Image
        ↓
Google Gemini
        ↓
Image Validation
        ↓
Further Water Analysis
```

---

### 2. Water Quality Analysis

The validated water image is processed using **OpenCV** to analyze water-quality characteristics.

The system includes analysis related to:

- pH
- Turbidity
- Visual water characteristics

```text
Water Image
     ↓
OpenCV Processing
     ↓
Water Quality Analysis
     ↓
Quality Information
```

---

### 3. Disease Prediction

The system uses reported symptoms as input to a **Random Forest Classifier**.

```text
Reported Symptoms
        ↓
Feature Engineering
        ↓
Machine Learning Model
        ↓
Random Forest Classifier
        ↓
Disease Prediction
```

The feature-engineering process includes symptom-related information such as:

- Symptom co-occurrence
- Symptom intensity

---

### 4. Risk Assessment

The system combines health and water-quality information to evaluate potential risk levels.

```text
Symptoms
   +
Water Quality
   +
Symptom Intensity
   ↓
Risk Assessment
   ↓
Health Risk Level
```

---

### 5. Health Trend Analysis

Reported health information is analyzed and visualized to help health workers identify:

- Health patterns
- Report trends
- Potential risk areas
- Geographical distribution

---

## 📊 System Components

| Component | Purpose |
|---|---|
| Villager Dashboard | Submit health reports and water samples |
| Health Worker Dashboard | Monitor and analyze health reports |
| Gemini AI | Validate and analyze water sample images |
| OpenCV | Analyze water-quality characteristics |
| Random Forest | Predict potential diseases |
| Risk Assessment | Evaluate health-risk levels |
| Mapbox GL | Visualize geographical reports |
| Recharts | Display health trends and statistics |
| Supabase | Database, authentication, storage and backend services |
| Edge Functions | Provide serverless API functionality |

---

## 📁 Project Structure

```text
Health-Monitor/
│
├── backend/
│   │
│   ├── ml/
│   │   ├── create_dataset.py
│   │   ├── preprocess_dataset.py
│   │   ├── train_model.py
│   │   └── requirements.txt
│   │
│   ├── opencv/
│   │   ├── opencv_analyzer.py
│   │   ├── requirements.txt
│   │   ├── start.bat
│   │   ├── start.sh
│   │   └── README.md
│   │
│   └── README.md
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── integrations/
│   ├── lib/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── supabase/
│   │
│   ├── functions/
│   │   ├── analyze-water-image/
│   │   ├── predict-disease/
│   │   ├── predict-risk/
│   │   └── fetch-water-quality-data/
│   │
│   └── migrations/
│
├── package.json
├── vite.config.*
├── tsconfig.*
└── README.md
```

---

## 📂 Project Organization

### Backend

The `backend/` directory contains the machine learning and computer vision services.

#### `backend/ml/`

Contains the machine-learning pipeline:

- Dataset generation
- Dataset preprocessing
- Model training
- ML dependencies

#### `backend/opencv/`

Contains the computer-vision service responsible for water-quality image analysis.

---

### Frontend

The `frontend/` directory contains the React application.

It includes:

- Reusable components
- Page components
- Custom hooks
- Supabase integrations
- Utility functions
- Application routing
- Global styling

---

### Supabase

The `supabase/` directory contains the project's backend infrastructure.

It includes:

- Edge Functions
- Database migrations
- Backend API functionality
- Data security policies

### Edge Functions

The system includes:

```text
analyze-water-image/
        ↓
Water image analysis

predict-disease/
        ↓
Disease prediction

predict-risk/
        ↓
Risk assessment

fetch-water-quality-data/
        ↓
Water-quality data retrieval
```

---

# 🚀 Getting Started

## Prerequisites

Before running the project, install:

- **Node.js 18+**
- **npm**
- **Python 3.8+**
- **Supabase account and project**

---

## 1. Frontend Setup

Open a terminal in the project root:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:8080
```

---

## 2. Configure Supabase

Create a `.env.local` or `.env` file in the project root.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Important

- Do not commit private credentials to GitHub.
- Do not expose service-role keys.
- Do not commit private API keys.
- Restart the development server after changing environment variables.

---

## 3. Machine Learning Backend Setup

Navigate to the ML directory:

```bash
cd backend/ml
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Generate the dataset:

```bash
python create_dataset.py
```

Train the model:

```bash
python train_model.py dataset.csv
```

---

## 4. OpenCV Backend Setup

Navigate to the OpenCV directory:

```bash
cd backend/opencv
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the OpenCV service:

```bash
python opencv_analyzer.py
```

The OpenCV service will run on:

```text
http://localhost:8000
```

### Windows

You can also use:

```bash
start.bat
```

### Linux / macOS

Use:

```bash
./start.sh
```

---

## 5. Supabase Setup

Create a Supabase project and configure the required environment.

Run database migrations:

```bash
supabase db push
```

Set the required Supabase secrets:

```bash
supabase secrets set OPENCV_SERVICE_URL=http://localhost:8000
supabase secrets set LOVABLE_API_KEY=your_api_key
```

Deploy the Edge Functions:

```bash
supabase functions deploy analyze-water-image
```

```bash
supabase functions deploy predict-disease
```

```bash
supabase functions deploy predict-risk
```

---

# 🧪 Testing

The project includes tools and documentation for testing and troubleshooting.

To verify the Supabase connection:

```bash
node verify-supabase.js
```

Expected result:

```text
✅ All tests passed!
```

For setup and troubleshooting, refer to:

```text
SETUP_GUIDE.md
TROUBLESHOOTING.md
ML_PREDICTION_GUIDE.md
```

---

# 🏃 Running the Complete Application

For local development, start the services in the following order.

### Step 1 — Start OpenCV

```bash
cd backend/opencv
python opencv_analyzer.py
```

### Step 2 — Start the Frontend

Open another terminal:

```bash
npm run dev
```

### Step 3 — Access the Application

Open the frontend in your browser:

```text
http://localhost:8080
```

---

# 📈 Application Capabilities

The system provides an integrated platform for:

```text
Health Reporting
       +
Water Image Analysis
       +
Computer Vision
       +
Machine Learning
       +
Risk Assessment
       +
Geographical Visualization
       +
Health Trend Analysis
       ↓
Early Warning Support
```

---

# 📚 Documentation

Additional technical documentation is available in the repository:

- **Backend Documentation** → `backend/README.md`
- **ML Documentation** → `backend/ml/README.md`
- **OpenCV Documentation** → `backend/opencv/README.md`
- **Setup Guide** → `SETUP_GUIDE.md`
- **Troubleshooting Guide** → `TROUBLESHOOTING.md`
- **ML Prediction Guide** → `ML_PREDICTION_GUIDE.md`

---

# 🚀 Future Enhancements

Potential future improvements include:

- Real-time outbreak alerts
- Improved disease prediction models
- Advanced water-quality prediction
- Mobile application
- Automated health-worker notifications
- Larger and more diverse training datasets
- Cloud deployment of ML services
- Cloud deployment of OpenCV services
- More advanced health trend analysis

---

# 🔐 Security

Security is an important part of the application.

### Environment Variables

Sensitive credentials should be stored using environment variables rather than committed to the repository.

Never commit:

```text
API keys
Service-role keys
Private credentials
Passwords
Authentication secrets
```

Use:

```text
.env
.env.local
```

and ensure sensitive files are included in `.gitignore`.

---

# ⚠️ Important Setup Notes

If you encounter:

```text
Invalid API Key
```

or:

```text
Failed to fetch
```

check the following:

1. Verify your Supabase URL.
2. Verify your Supabase anonymous key.
3. Make sure the environment file is configured correctly.
4. Restart the development server.
5. Check the browser console using `F12`.
6. Verify that the required Supabase services are configured.
7. Refer to `SETUP_GUIDE.md`.
8. Refer to `TROUBLESHOOTING.md`.

---

# 🌟 Project Highlights

### Artificial Intelligence

Uses **Google Gemini 2.5 Flash** for water-image validation and analysis.

### Machine Learning

Uses a **Random Forest Classifier** for symptom-based disease prediction.

### Computer Vision

Uses **OpenCV** for water-quality image analysis.

### Full-Stack Development

Combines:

```text
React + TypeScript
        +
Python + Flask
        +
Supabase
        +
Machine Learning
        +
Computer Vision
```

into a single health-monitoring platform.

---

# 👥 Intended Users

### Villagers

- Report health issues
- Submit symptoms
- Provide location information
- Upload water sample images

### Health Workers

- Monitor health reports
- Review disease predictions
- Analyze water-quality information
- View risk levels
- Analyze trends
- Provide safety advice

---

# 📌 Project Summary

The **AI-Based Early Warning System for Water-Borne Diseases** integrates health reporting, artificial intelligence, machine learning, computer vision, risk assessment, and geographical visualization to support early identification and monitoring of potential water-borne disease risks in village communities.

The platform provides a centralized environment where **villagers can report health concerns and health workers can analyze the collected information to support monitoring and early response**.

---

## 📄 License

This project is developed as an academic/project implementation of an AI-based early warning system for water-borne disease monitoring.
