#!/usr/bin/env python3
'''
Generate daily brief audio (MP3) from brief JSON using TTS.

Primary: Azure Cognitive Services Speech (zh-TW-HsiaoChenNeural)
Fallback: edge-tts (if Azure env vars missing)

Usage:
  python scripts/generate-brief-audio.py [YYYY-MM-DD]
  # If no date given, uses today in HKT

Environment Variables (Azure):
  AZURE_SPEECH_KEY     - Azure Speech service key
  AZURE_SPEECH_REGION  - Azure region (e.g. eastasia)

Output:
  data/audio/YYYY-MM-DD.mp3     - Audio file
  data/audio/YYYY-MM-DD.txt     - Spoken script (debug)
  Updates data/briefs/YYYY-MM-DD.json with audioUrl
'''

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path


def get_hkt_date():
  '''Get current date in HKT (UTC+8).'''
  from datetime import timezone
  hkt = timezone(timedelta(hours=8))
  return datetime.now(hkt).strftime('%Y-%m-%d')


def load_brief(date_str):
  '''Load brief JSON for given date.'''
  brief_path = Path(f'data/briefs/{date_str}.json')
  if not brief_path.exists():
    raise FileNotFoundError(f'Brief not found: {brief_path}')
  
  with open(brief_path, 'r', encoding='utf-8') as f:
    return json.load(f)


def build_spoken_script(brief):
  '''
  Build Traditional Chinese spoken script from brief.
  
  Structure:
  - Date intro
  - Each story: title, summary, whyItMatters, whatToWatch
  - Short sentences, skip empty fields
  - Cap at ~2500-3500 chars if needed
  '''
  date_str = brief.get('date', '')
  # Parse date for spoken format
  try:
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    month = dt.month
    day = dt.day
    spoken_date = f'{month}月{day}日'
  except:
    spoken_date = date_str
  
  lines = []
  lines.append(f'投資簡報。{spoken_date}。')
  
  stories = brief.get('stories', [])
  if not stories:
    lines.append('今日冇新故事。')
  
  for story in stories:
    # Story title
    title = story.get('title', '').strip()
    if title:
      lines.append(title)
    
    # Summary
    summary = story.get('summary', '').strip()
    if summary:
      # Break long sentences at punctuation
      summary = summary.replace('。', '。 ').replace('，', '， ')
      lines.append(summary)
    
    # Why it matters
    why = story.get('whyItMatters', '').strip()
    if why:
      lines.append('點解要理？')
      why = why.replace('。', '。 ').replace('，', '， ')
      lines.append(why)
    
    # What to watch
    watch = story.get('whatToWatch', '').strip()
    if watch:
      lines.append('接下來睇咩？')
      watch = watch.replace('。', '。 ').replace('，', '， ')
      lines.append(watch)
    
    lines.append('')  # Pause between stories
  
  lines.append('以上係今日簡報。非投資建議，僅供參考。')
  
  script = '\n'.join(lines)
  
  # Cap at ~3500 chars (roughly 3-4 minutes)
  MAX_CHARS = 3500
  if len(script) > MAX_CHARS:
    script = script[:MAX_CHARS]
    # Try to cut at sentence boundary
    last_period = script.rfind('。')
    if last_period > MAX_CHARS - 500:
      script = script[:last_period + 1]
    script += '\n內容過長，已截斷。'
  
  return script


def synthesize_with_azure(script, output_path, voice='zh-TW-HsiaoChenNeural'):
  '''
  Synthesize speech using Azure Cognitive Services Speech.
  
  Returns True if successful, False otherwise.
  '''
  key = os.getenv('AZURE_SPEECH_KEY')
  region = os.getenv('AZURE_SPEECH_REGION')
  
  if not key or not region:
    print('Azure Speech env vars not set (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION)')
    return False
  
  try:
    import azure.cognitiveservices.speech as speechsdk
  except ImportError:
    print('azure-cognitiveservices-speech not installed. Install: pip install azure-cognitiveservices-speech')
    return False
  
  speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
  speech_config.speech_synthesis_voice_name = voice
  speech_config.set_speech_synthesis_output_format(
    speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
  )
  
  audio_config = speechsdk.audio.AudioOutputConfig(filename=str(output_path))
  synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
  
  print(f'Synthesizing with Azure ({voice})...')
  result = synthesizer.speak_text_async(script).get()
  
  if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
    print(f'✓ Azure TTS succeeded: {output_path}')
    return True
  elif result.reason == speechsdk.ResultReason.Canceled:
    cancellation_details = result.cancellation_details
    print(f'Azure TTS canceled: {cancellation_details.reason}')
    if cancellation_details.error_details:
      print(f'Error: {cancellation_details.error_details}')
    return False
  else:
    print(f'Azure TTS failed: {result.reason}')
    return False


def synthesize_with_edge_tts(script, output_path, voice='zh-TW-HsiaoChenNeural'):
  '''
  Synthesize speech using edge-tts (fallback).
  
  Returns True if successful, False otherwise.
  '''
  try:
    import edge_tts
    import asyncio
  except ImportError:
    print('edge-tts not installed. Install: pip install edge-tts')
    return False
  
  async def _synthesize():
    communicate = edge_tts.Communicate(script, voice)
    await communicate.save(str(output_path))
  
  print(f'Synthesizing with edge-tts ({voice})...')
  try:
    asyncio.run(_synthesize())
    print(f'✓ edge-tts succeeded: {output_path}')
    return True
  except Exception as e:
    print(f'edge-tts failed: {e}')
    return False


def update_brief_with_audio(date_str, script_chars, voice):
  '''Update brief JSON with audioUrl and metadata.'''
  brief_path = Path(f'data/briefs/{date_str}.json')
  
  with open(brief_path, 'r', encoding='utf-8') as f:
    brief = json.load(f)
  
  brief['audioUrl'] = f'data/audio/{date_str}.mp3'
  brief['audioScriptChars'] = script_chars
  brief['audioVoice'] = voice
  
  with open(brief_path, 'w', encoding='utf-8') as f:
    json.dump(brief, f, ensure_ascii=False, indent=2)
  
  print(f'✓ Updated {brief_path} with audio metadata')


def main():
  # Parse date arg or use today HKT
  if len(sys.argv) > 1:
    date_str = sys.argv[1]
  else:
    date_str = get_hkt_date()
  
  print(f'Generating audio for {date_str}')
  
  # Load brief
  try:
    brief = load_brief(date_str)
  except FileNotFoundError as e:
    print(f'Error: {e}')
    sys.exit(1)
  
  # Build spoken script
  script = build_spoken_script(brief)
  script_chars = len(script)
  print(f'Script: {script_chars} chars')
  
  # Write script to txt (debug)
  script_path = Path(f'data/audio/{date_str}.txt')
  script_path.parent.mkdir(parents=True, exist_ok=True)
  with open(script_path, 'w', encoding='utf-8') as f:
    f.write(script)
  print(f'✓ Wrote script: {script_path}')
  
  # Synthesize audio
  audio_path = Path(f'data/audio/{date_str}.mp3')
  voice = 'zh-TW-HsiaoChenNeural'
  
  # Try Azure first
  success = synthesize_with_azure(script, audio_path, voice)
  
  # Fallback to edge-tts
  if not success:
    print('Falling back to edge-tts...')
    success = synthesize_with_edge_tts(script, audio_path, voice)
  
  if not success:
    print('ERROR: Both Azure and edge-tts failed')
    sys.exit(1)
  
  # Update brief JSON
  update_brief_with_audio(date_str, script_chars, voice)
  
  print(f'✅ Done! Audio: {audio_path}')


if __name__ == '__main__':
  main()
