$ErrorActionPreference = "Stop"

function Require-Env {
  param(
    [string]$Name
  )

  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Environment variable '$Name' is required."
  }

  return $value
}

function Get-OptionalEnv {
  param(
    [string]$Name,
    [string]$DefaultValue = ""
  )

  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $DefaultValue
  }

  return $value
}

function Write-Log {
  param(
    [string]$Message
  )

  $timestamp = [DateTime]::UtcNow.ToString("o")
  $line = "[$timestamp] $Message"
  Write-Host $line

  if (-not [string]::IsNullOrWhiteSpace($script:JobLogPath)) {
    Add-Content -LiteralPath $script:JobLogPath -Value $line
  }
}

function Require-Path {
  param(
    [string]$PathValue,
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $PathValue)) {
    throw "$Label not found: $PathValue"
  }
}

function Convert-ToGamePath {
  param(
    [string]$PathValue
  )

  return $PathValue.Replace("\", "/")
}

function New-JobCommandXml {
  param(
    [string]$OutputPath,
    [int]$SkipTick,
    [int]$StartTick,
    [int]$EndTick,
    [int]$QuitTick
  )

  $xml = New-Object System.Text.StringBuilder
  [void]$xml.AppendLine('<?xml version="1.0" encoding="utf-8"?>')
  [void]$xml.AppendLine("<commandSystem>")
  [void]$xml.AppendLine("  <commands>")

  if ($SkipTick -gt 1) {
    [void]$xml.AppendLine("    <c tick=""1""><body>mirv_skip tick to $SkipTick</body></c>")
  }

  [void]$xml.AppendLine("    <c tick=""$StartTick""><body>mirv_streams record start</body></c>")
  [void]$xml.AppendLine("    <c tick=""$EndTick""><body>mirv_streams record end</body></c>")
  [void]$xml.AppendLine("    <c tick=""$QuitTick""><body>quit</body></c>")
  [void]$xml.AppendLine("  </commands>")
  [void]$xml.AppendLine("</commandSystem>")

  [System.IO.File]::WriteAllText($OutputPath, $xml.ToString(), [System.Text.Encoding]::UTF8)
}

function Write-RenderCfg {
  param(
    [string]$OutputPath,
    [string]$RecordNameBase,
    [string]$CommandXmlPath,
    [string]$DemoFilePath,
    [int]$Fps
  )

  $recordPath = Convert-ToGamePath $RecordNameBase
  $commandPath = Convert-ToGamePath $CommandXmlPath
  $demoPath = Convert-ToGamePath $DemoFilePath

  $lines = @(
    "echo [gamerfied] render worker bootstrap"
    "mirv_cmd clear"
    "mirv_streams record name ""$recordPath"""
    "mirv_streams record fps $Fps"
    "mirv_streams record startMovieWav 1"
    "mirv_streams record screen settings afxFfmpegYuv420p"
    "mirv_streams record screen enabled 1"
    "mirv_cmd load ""$commandPath"""
    "playdemo ""$demoPath"""
  )

  [System.IO.File]::WriteAllLines($OutputPath, $lines, [System.Text.Encoding]::ASCII)
}

function Wait-ForProcessStart {
  param(
    [string]$ProcessName,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $process) {
      return $process
    }

    Start-Sleep -Seconds 2
  }

  throw "Timed out waiting for process '$ProcessName' to start."
}

function Wait-ForProcessExit {
  param(
    [System.Diagnostics.Process]$Process,
    [int]$TimeoutSeconds
  )

  if ($Process.HasExited) {
    return
  }

  if (-not $Process.WaitForExit($TimeoutSeconds * 1000)) {
    throw "Timed out waiting for $($Process.ProcessName) to exit."
  }
}

function Get-LatestTakeDirectory {
  param(
    [string]$RecordNameBase
  )

  $recordParent = Split-Path -Parent $RecordNameBase
  $recordLeaf = Split-Path -Leaf $RecordNameBase

  $candidateRoot = Join-Path $recordParent $recordLeaf
  if (-not (Test-Path -LiteralPath $candidateRoot)) {
    throw "Expected recording root was not created: $candidateRoot"
  }

  $takeDir = Get-ChildItem -LiteralPath $candidateRoot -Directory -Filter "take*" |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1

  if ($null -eq $takeDir) {
    throw "No HLAE take directory was created under $candidateRoot"
  }

  return $takeDir.FullName
}

function Invoke-Ffmpeg {
  param(
    [string]$FfmpegPath,
    [string[]]$Arguments
  )

  $process = Start-Process -FilePath $FfmpegPath -ArgumentList $Arguments -PassThru -NoNewWindow -Wait
  if ($process.ExitCode -ne 0) {
    throw "FFmpeg failed with exit code $($process.ExitCode)."
  }
}

function Build-FinalVideo {
  param(
    [string]$TakeDir,
    [string]$OutputVideoPath,
    [string]$FfmpegPath
  )

  $videoMp4Path = Join-Path $TakeDir "video.mp4"
  $videoAviPath = Join-Path $TakeDir "video.avi"
  $audioPath = Join-Path $TakeDir "audio.wav"

  if (Test-Path -LiteralPath $videoMp4Path) {
    if (Test-Path -LiteralPath $audioPath) {
      Invoke-Ffmpeg -FfmpegPath $FfmpegPath -Arguments @(
        "-y",
        "-i", $videoMp4Path,
        "-i", $audioPath,
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        $OutputVideoPath
      )
      return
    }

    Copy-Item -LiteralPath $videoMp4Path -Destination $OutputVideoPath -Force
    return
  }

  if (Test-Path -LiteralPath $videoAviPath) {
    if (Test-Path -LiteralPath $audioPath) {
      Invoke-Ffmpeg -FfmpegPath $FfmpegPath -Arguments @(
        "-y",
        "-i", $videoAviPath,
        "-i", $audioPath,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        $OutputVideoPath
      )
      return
    }

    Invoke-Ffmpeg -FfmpegPath $FfmpegPath -Arguments @(
      "-y",
      "-i", $videoAviPath,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      $OutputVideoPath
    )
    return
  }

  $bmpFrames = Get-ChildItem -LiteralPath $TakeDir -Filter "*.bmp" -File | Sort-Object Name
  $tgaFrames = Get-ChildItem -LiteralPath $TakeDir -Filter "*.tga" -File | Sort-Object Name

  if ($bmpFrames.Count -gt 0) {
    $frameInput = Join-Path $TakeDir "%05d.bmp"
  } elseif ($tgaFrames.Count -gt 0) {
    $frameInput = Join-Path $TakeDir "%05d.tga"
  } else {
    throw "No video.mp4, video.avi, BMP frames, or TGA frames were produced in $TakeDir"
  }

  $ffmpegArgs = @(
    "-y",
    "-framerate", "60",
    "-start_number", "0",
    "-i", $frameInput
  )

  if (Test-Path -LiteralPath $audioPath) {
    $ffmpegArgs += @("-i", $audioPath, "-c:a", "aac", "-shortest")
  }

  $ffmpegArgs += @(
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    $OutputVideoPath
  )

  Invoke-Ffmpeg -FfmpegPath $FfmpegPath -Arguments $ffmpegArgs
}

$jobId = Require-Env "RENDER_JOB_ID"
$jobDir = Require-Env "RENDER_JOB_DIR"
$demoFilePath = Require-Env "DEMO_FILE_PATH"
$outputVideoPath = Require-Env "OUTPUT_VIDEO_PATH"
$cs2ExePath = Require-Env "CS2_EXE_PATH"
$hlaeExePath = Require-Env "HLAE_EXE_PATH"
$ffmpegExePath = Require-Env "FFMPEG_EXE_PATH"
$ffprobeExePath = Require-Env "FFPROBE_EXE_PATH"
$startTick = [int](Require-Env "HIGHLIGHT_START_TICK")
$endTick = [int](Require-Env "HIGHLIGHT_END_TICK")
$script:JobLogPath = Get-OptionalEnv -Name "WORKER_JOB_LOG_PATH" -DefaultValue (Join-Path $jobDir "render-job.log")

try {
Write-Log "render-highlight.ps1 starting for job $jobId"

Require-Path $jobDir "Render job directory"
Require-Path $demoFilePath "Demo file"
Require-Path $cs2ExePath "CS2 executable"
Require-Path $hlaeExePath "HLAE executable"
Require-Path $ffmpegExePath "FFmpeg executable"
Require-Path $ffprobeExePath "FFprobe executable"
Write-Log "validated required paths"

$existingCs2 = Get-Process -Name "cs2" -ErrorAction SilentlyContinue
if ($existingCs2) {
  throw "cs2.exe is already running. Close Counter-Strike 2 before starting the render worker."
}

$outputDir = Split-Path -Parent $outputVideoPath
if (-not [string]::IsNullOrWhiteSpace($outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$hookDllPath = Join-Path (Split-Path -Parent $hlaeExePath) "x64\AfxHookSource2.dll"
Require-Path $hookDllPath "HLAE Source2 hook DLL"
Write-Log "using hook DLL $hookDllPath"

$steamPath = Get-OptionalEnv -Name "STEAM_PATH" -DefaultValue "C:\Program Files (x86)\Steam"
Require-Path (Join-Path $steamPath "steam.exe") "Steam installation"
Write-Log "using Steam path $steamPath"

$fps = [int](Get-OptionalEnv -Name "RENDER_FPS" -DefaultValue "60")
$skipPrerollTicks = [int](Get-OptionalEnv -Name "HIGHLIGHT_SKIP_PREROLL_TICKS" -DefaultValue "128")
$quitDelayTicks = [int](Get-OptionalEnv -Name "HIGHLIGHT_QUIT_DELAY_TICKS" -DefaultValue "64")
$launchTimeoutSeconds = [int](Get-OptionalEnv -Name "RENDER_LAUNCH_TIMEOUT_SECONDS" -DefaultValue "90")
$renderTimeoutSeconds = [int](Get-OptionalEnv -Name "RENDER_TIMEOUT_SECONDS" -DefaultValue "1800")

$skipTick = [Math]::Max($startTick - $skipPrerollTicks, 1)
$quitTick = $endTick + $quitDelayTicks

$mmcfgParent = Join-Path $jobDir "mmcfg"
$cfgDir = Join-Path $mmcfgParent "cfg"
$recordNameBase = Join-Path $jobDir "capture"
$commandXmlPath = Join-Path $jobDir "render-commands.xml"
$cfgSafeJobId = ($jobId -replace "[^A-Za-z0-9_]", "_")
$cfgBaseName = "gamerfied_render_$cfgSafeJobId"
$cfgPath = Join-Path $cfgDir "$cfgBaseName.cfg"
$manifestPath = Join-Path $jobDir "render-job.json"

New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
New-Item -ItemType Directory -Force -Path $recordNameBase | Out-Null
Write-Log "created working directories under $jobDir"

New-JobCommandXml -OutputPath $commandXmlPath -SkipTick $skipTick -StartTick $startTick -EndTick $endTick -QuitTick $quitTick
Write-RenderCfg -OutputPath $cfgPath -RecordNameBase $recordNameBase -CommandXmlPath $commandXmlPath -DemoFilePath $demoFilePath -Fps $fps
Write-Log "generated command XML at $commandXmlPath"
Write-Log "generated CS2 cfg at $cfgPath"

$manifest = [ordered]@{
  jobId = $jobId
  demoFilePath = $demoFilePath
  outputVideoPath = $outputVideoPath
  cs2ExePath = $cs2ExePath
  hlaeExePath = $hlaeExePath
  hookDllPath = $hookDllPath
  ffmpegExePath = $ffmpegExePath
  ffprobeExePath = $ffprobeExePath
  steamPath = $steamPath
  cfgPath = $cfgPath
  commandXmlPath = $commandXmlPath
  recordNameBase = $recordNameBase
  skipTick = $skipTick
  startTick = $startTick
  endTick = $endTick
  quitTick = $quitTick
  fps = $fps
  generatedAtUtc = [DateTime]::UtcNow.ToString("o")
}

$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Log "wrote manifest to $manifestPath"

$cs2CmdLine = "-steam -insecure -window -w 1920 -h 1080 -afxDisableSteamStorage +exec $cfgBaseName"
$hlaeArgs = @(
  "-noGui",
  "-customLoader",
  "-autoStart",
  "-hookDllPath", $hookDllPath,
  "-programPath", $cs2ExePath,
  "-cmdLine", $cs2CmdLine,
  "-addEnv", "USRLOCALCSGO=$mmcfgParent",
  "-addEnv", "SteamPath=$steamPath",
  "-addEnv", "SteamClientLaunch=1",
  "-addEnv", "SteamGameId=730",
  "-addEnv", "SteamAppId=730",
  "-addEnv", "SteamOverlayGameId=730"
)

Write-Log "launching HLAE custom loader"
Write-Log "CS2 command line: $cs2CmdLine"
$hlaeProcess = Start-Process -FilePath $hlaeExePath -ArgumentList $hlaeArgs -WorkingDirectory (Split-Path -Parent $hlaeExePath) -PassThru -WindowStyle Hidden
$hlaeProcess.WaitForExit()
Write-Log "HLAE process exited with code $($hlaeProcess.ExitCode)"

if ($hlaeProcess.ExitCode -ne 0) {
  throw "HLAE exited with code $($hlaeProcess.ExitCode) before the render started."
}

$cs2Process = Wait-ForProcessStart -ProcessName "cs2" -TimeoutSeconds $launchTimeoutSeconds
Write-Log "CS2 started with PID $($cs2Process.Id)"
Write-Log "waiting up to $renderTimeoutSeconds seconds for CS2 to exit"

Wait-ForProcessExit -Process $cs2Process -TimeoutSeconds $renderTimeoutSeconds
Write-Log "CS2 exited"

$takeDir = Get-LatestTakeDirectory -RecordNameBase $recordNameBase
Write-Log "render output found in $takeDir"

Build-FinalVideo -TakeDir $takeDir -OutputVideoPath $outputVideoPath -FfmpegPath $ffmpegExePath
Write-Log "final video build step completed"

Require-Path $outputVideoPath "Final rendered MP4"

Write-Log "render completed: $outputVideoPath"
}
catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  throw
}
