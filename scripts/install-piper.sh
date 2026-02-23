#!/usr/bin/env bash
# install-piper.sh — Download Piper binary + voice models
set -euo pipefail

PIPER_VERSION="2023.11.14-2"
PIPER_DIR="/opt/piper"
VOICES_DIR="${PIPER_DIR}/voices"

echo "==> Installing Piper TTS to ${PIPER_DIR}"

mkdir -p "${PIPER_DIR}" "${VOICES_DIR}"

# Download and extract piper binary
if [ ! -f "${PIPER_DIR}/piper" ]; then
    echo "==> Downloading Piper ${PIPER_VERSION}..."
    cd /tmp
    curl -fSL "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_x86_64.tar.gz" -o piper.tar.gz
    tar xzf piper.tar.gz
    cp piper/piper "${PIPER_DIR}/piper"
    # Copy all library files
    cp -r piper/lib* "${PIPER_DIR}/" 2>/dev/null || true
    cp piper/espeak-ng-data "${PIPER_DIR}/" -r 2>/dev/null || true
    cp piper/piper_phonemize* "${PIPER_DIR}/" 2>/dev/null || true
    chmod +x "${PIPER_DIR}/piper"
    rm -rf /tmp/piper /tmp/piper.tar.gz
    echo "==> Piper binary installed."
else
    echo "==> Piper binary already exists, skipping."
fi

# Download voice models from HuggingFace
download_voice() {
    local name="$1"
    local quality="$2"
    local filename="${name}-${quality}.onnx"

    # Construct the HuggingFace URL
    # Format: https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/<lang>/<region>/<speaker>/<quality>/<filename>
    local lang="${name%%_*}"          # e.g. en
    local rest="${name#*_}"           # e.g. US-lessac
    local region="${rest%%-*}"        # e.g. US
    local speaker="${rest#*-}"        # e.g. lessac

    local base_url="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/${lang}/${lang}_${region}/${speaker}/${quality}"

    if [ ! -f "${VOICES_DIR}/${filename}" ]; then
        echo -n "==> Downloading voice: ${filename}... "
        if curl -fsSL "${base_url}/${filename}" -o "${VOICES_DIR}/${filename}" 2>/dev/null; then
            curl -fsSL "${base_url}/${filename}.json" -o "${VOICES_DIR}/${filename}.json" 2>/dev/null || true
            echo "OK ($(du -h "${VOICES_DIR}/${filename}" | cut -f1))"
        else
            echo "NOT FOUND"
            rm -f "${VOICES_DIR}/${filename}"
        fi
    else
        echo "==> Voice ${filename} already exists, skipping."
    fi
}

# ── en_US voices (medium where available, fallback to best available) ──
download_voice "en_US-lessac" "medium"
download_voice "en_US-amy" "medium"
download_voice "en_US-arctic" "medium"
download_voice "en_US-bryce" "medium"
download_voice "en_US-danny" "low"           # no medium available
download_voice "en_US-hfc_female" "medium"
download_voice "en_US-hfc_male" "medium"
download_voice "en_US-joe" "medium"
download_voice "en_US-john" "medium"
download_voice "en_US-kathleen" "low"        # no medium available
download_voice "en_US-kristin" "medium"
download_voice "en_US-kusal" "medium"
download_voice "en_US-l2arctic" "medium"
download_voice "en_US-libritts" "high"       # no medium available
download_voice "en_US-libritts_r" "medium"
download_voice "en_US-ljspeech" "medium"
download_voice "en_US-norman" "medium"
download_voice "en_US-reza_ibrahim" "medium"
download_voice "en_US-ryan" "medium"
download_voice "en_US-sam" "medium"

# ── en_GB voices ──
download_voice "en_GB-alan" "medium"
download_voice "en_GB-alba" "medium"
download_voice "en_GB-aru" "medium"
download_voice "en_GB-cori" "medium"
download_voice "en_GB-jenny_dioco" "medium"
download_voice "en_GB-northern_english_male" "medium"
download_voice "en_GB-semaine" "medium"
download_voice "en_GB-southern_english_female" "low"  # no medium available
download_voice "en_GB-vctk" "medium"

echo "==> Piper installation complete."
echo "   Binary: ${PIPER_DIR}/piper"
echo "   Voices: ${VOICES_DIR}"

# Quick test
echo "==> Testing piper..."
echo "Hello, this is a test." | "${PIPER_DIR}/piper" --model "${VOICES_DIR}/en_US-lessac-medium.onnx" --output_file /tmp/test_piper.wav 2>/dev/null && echo "==> Piper test PASSED" || echo "==> Piper test FAILED"
rm -f /tmp/test_piper.wav
