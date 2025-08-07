from flask import Flask, request, jsonify, g
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'spotify-downloader'))
from spotdl import Spotdl
import logging
import signal
import traceback
from functools import wraps
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        # logging.FileHandler('server.log', mode='a')
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()
client_id = os.getenv("SPOTIFY_CLIENT_ID")
client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

# Initialize Spotdl with error handling
try:
    spotdl = Spotdl(client_id, client_secret)
    logger.info("Spotdl initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Spotdl: {str(e)}")
    spotdl = None

app = Flask(__name__)

# Global error handler decorator
def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({
                "error": "Internal server error",
                "message": str(e),
                "endpoint": f.__name__
            }), 500
    return decorated_function

# Middleware to validate request parameters
@app.before_request
def validate_request():
    try:
        # Check if spotdl is available
        if spotdl is None and request.endpoint not in ['health', 'static']:
            return jsonify({"error": "Service temporarily unavailable"}), 503
        
    except Exception as e:
        logger.error(f"Error in before_request: {str(e)}")
        return jsonify({"error": "Request validation failed"}), 400

# Health check endpoint
@app.route('/health')
@handle_errors
def health():
    return jsonify({
        "status": "healthy",
        "spotdl_available": spotdl is not None,
        "timestamp": os.popen('date').read().strip()
    })

# Global error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_server_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

@app.route('/search_suggestions')
@handle_errors
def search_suggestions():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Missing required parameter 'q'"}), 400
    
    if not query.strip():
        return jsonify({"error": "Parameter 'q' cannot be empty"}), 400
    
    logger.info(f"Search suggestions for query: {query}")
    result = spotdl.get_search_suggestions(query)
    return jsonify(result)

@app.route('/related_tracks')
@handle_errors
def related_tracks():
    track_id = request.args.get('track_id')
    if not track_id:
        return jsonify({"error": "Missing required parameter 'track_id'"}), 400
    
    if not track_id.strip():
        return jsonify({"error": "Parameter 'track_id' cannot be empty"}), 400
    
    logger.info(f"Getting related tracks for ID: {track_id}")
    result = spotdl.get_related_tracks(track_id)
    return jsonify(result)

@app.route('/watch_playlist')
@handle_errors
def watch_playlist():
    track_id = request.args.get('track_id')
    if not track_id:
        return jsonify({"error": "Missing required parameter 'track_id'"}), 400
    
    if not track_id.strip():
        return jsonify({"error": "Parameter 'track_id' cannot be empty"}), 400
    
    logger.info(f"Getting watch playlist for ID: {track_id}")
    result = spotdl.get_watch_playlist(track_id)
    return jsonify(result['tracks'])

# explore
@app.route('/mood_categories')
@handle_errors
def mood_categories():
    logger.info("Getting mood categories")
    result = spotdl.get_mood_categories()
    return jsonify(result)

@app.route('/mood_playlists')
@handle_errors
def mood_playlists():
    mood = request.args.get('mood')
    if not mood:
        return jsonify({"error": "Missing required parameter 'mood'"}), 400
    
    if not mood.strip():
        return jsonify({"error": "Parameter 'mood' cannot be empty"}), 400
    
    logger.info(f"Getting mood playlists for mood: {mood}")
    result = spotdl.get_mood_playlists(mood)
    return jsonify(result)

@app.route('/charts')
@handle_errors
def charts():
    logger.info("Getting charts")
    result = spotdl.get_charts()
    return jsonify(result)

@app.route('/get_video_id')
@handle_errors
def get_video_id():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Missing required parameter 'q'"}), 400
    
    if not query.strip():
        return jsonify({"error": "Parameter 'q' cannot be empty"}), 400
    
    logger.info(f"Getting video ID for query: {query}")
    result = spotdl.get_video_id(query)
    return jsonify({"id": result})

# Application entry point with proper error handling
if __name__ == '__main__':
    try:
        logger.info("Starting Flask server...")
        app.run(debug=False, host='0.0.0.0', port=54321)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        sys.exit(1)

