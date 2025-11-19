# Backend Directory

This directory contains all backend code for the Health Monitor application.

## Structure

```
backend/
├── ml/                    # Machine Learning models and training
│   ├── create_dataset.py  # Dataset generation
│   ├── preprocess_dataset.py  # Data preprocessing
│   ├── train_model.py     # Model training
│   └── requirements.txt   # Python dependencies
├── opencv/                # OpenCV Water Quality Analysis Service
│   ├── opencv_analyzer.py # Main OpenCV analysis service
│   ├── requirements.txt   # Python dependencies
│   ├── start.bat          # Windows startup script
│   ├── start.sh           # Linux/Mac startup script
│   ├── run.py             # Alternative runner script
│   ├── test_service.py    # Service testing script
│   └── README.md          # OpenCV service documentation
└── README.md              # This file
```

## ML Backend

The ML backend is located in `backend/ml/` and handles:
- Dataset creation for disease prediction
- Feature engineering
- Model training with hyperparameter tuning
- Model export for Supabase Edge Functions

See `backend/ml/README.md` for detailed ML documentation.

## OpenCV Backend

The OpenCV backend is located in `backend/opencv/` and handles:
- Water sample image analysis
- pH estimation from color analysis
- Turbidity measurement from clarity/contrast
- Water quality assessment

See `backend/opencv/README.md` for detailed OpenCV documentation.

### Quick Start

```bash
cd backend/opencv
pip install -r requirements.txt
python opencv_analyzer.py
```

The service runs on `http://localhost:8000` and is called by the Supabase Edge Function `analyze-water-image`.

## Supabase Edge Functions

The Edge Functions (TypeScript/Deno) remain in:
- `supabase/functions/predict-disease/` - Disease prediction API
- `supabase/functions/predict-risk/` - Risk assessment API
- `supabase/functions/analyze-water-image/` - Water image analysis API

These functions use the trained models exported from the ML backend.

## Workflow

1. **Train Model** (in `backend/ml/`):
   ```bash
   cd backend/ml
   python create_dataset.py
   python train_model.py dataset.csv
   ```

2. **Model Export**: Automatically exports to `supabase/functions/predict-disease/trained_disease_model.json`

3. **Edge Function**: Uses the exported model for predictions

## Dependencies

- Python 3.8+
- scikit-learn, numpy, pandas
- See `backend/ml/requirements.txt` for details

