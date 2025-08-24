from flask import Flask, render_template, jsonify
import os
from flask import Flask, send_from_directory

app = Flask(__name__)

# default durations (minutes)
DEFAULTS = {
    "pomodoro": 25,
    "short_break": 5,
    "long_break": 15,
    "sessions_before_long": 4
}

THEMES = [
    {"id": "sunset", "name": "Sunset Glow", "class": "theme-sunset"},
    {"id": "ocean", "name": "Ocean Breeze", "class": "theme-ocean"},
    {"id": "forest", "name": "Forest Mist", "class": "theme-forest"},
    {"id": "candy", "name": "Candy Pop", "class": "theme-candy"},
    {"id": "midnight", "name": "Midnight Pulse", "class": "theme-midnight"}
]

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')


@app.context_processor
def inject_globals():
    defaults = {
        "pomodoro": 25,
        "short_break": 5,
        "long_break": 15,
        "sessions_before_long": 4
    }

    themes = [
        {"class": "theme-sunset", "name": "Sunset"},
        {"class": "theme-ocean", "name": "Ocean"},
        {"class": "theme-forest", "name": "Forest"},
    ]

    return dict(defaults=defaults, themes=themes, app_version="1.0.0")



@app.route("/")
def index():
    return render_template(
        "index.html",
        defaults=DEFAULTS,
        themes=THEMES,
        app_version=os.environ.get("APP_VERSION", "1.0.0")
    )


@app.route("/account")
def account():
    defaults = {
        "pomodoro": 25,
        "short_break": 5,
        "long_break": 15,
        "sessions_before_long": 4
    }

    themes = [
        {"class": "theme-sunset", "name": "Sunset"},
        {"class": "theme-ocean", "name": "Ocean"},
        {"class": "theme-forest", "name": "Forest"},
    ]

    return render_template("account.html",
                           defaults=defaults,
                           themes=themes,
                           app_version="1.0.0")



@app.route("/health")
def health():
    return jsonify(status="ok", version=os.environ.get("APP_VERSION", "1.0.0"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
