#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Create a self-signed TLS certificate for a PokerProbe desktop subdomain and bind it in IIS.

.EXAMPLE
  .\myrtille-bind-ssl.ps1 -Hostname k7m2p9xq.pokerprobe.com
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Hostname,

  [string]$SiteName = "Default Web Site",

  [int]$Port = 443,

  [switch]$RemoveCatchAllHttps,

  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

if ($Hostname -notlike "*.pokerprobe.com") {
  Write-Warning "Hostname '$Hostname' does not end with .pokerprobe.com - continuing anyway."
}

Import-Module WebAdministration

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
  throw "IIS site not found: '$SiteName'. List sites: Get-Website | Select-Object Name, State"
}

Write-Step "Target site: $SiteName"
Write-Step "Hostname: $Hostname"
Write-Step "HTTPS port (IIS): $Port"

$bindingInformation = "*:$Port`:$Hostname"

if ($RemoveCatchAllHttps) {
  $catchAll443 = '*:443:'
  $catchAllPort = "*:$Port`:"
  $catchAll = Get-WebBinding -Name $SiteName -Protocol "https" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.bindingInformation -eq $catchAll443 -or $_.bindingInformation -eq $catchAllPort
    }
  foreach ($binding in $catchAll) {
    Write-Step "Removing catch-all HTTPS binding: $($binding.bindingInformation)"
    if (-not $WhatIf) {
      Remove-WebBinding -Name $SiteName -Binding $binding.bindingInformation
    }
  }
}

$existingHostBinding = Get-WebBinding -Name $SiteName -Protocol "https" -ErrorAction SilentlyContinue |
  Where-Object { $_.bindingInformation -eq $bindingInformation }

if ($existingHostBinding) {
  Write-Step "Removing existing HTTPS binding for $bindingInformation"
  if (-not $WhatIf) {
    Remove-WebBinding -Name $SiteName -Binding $bindingInformation
  }
}

$sslBindingPath = "IIS:\SslBindings\0.0.0.0!$Port!$Hostname"
if (Test-Path $sslBindingPath) {
  Write-Step "Removing existing SSL binding at $sslBindingPath"
  if (-not $WhatIf) {
    Remove-Item $sslBindingPath -Force
  }
}

Write-Step "Creating self-signed certificate for DNS:$Hostname"
if ($WhatIf) {
  Write-Host "WhatIf: would create cert and bind to $bindingInformation"
  exit 0
}

$certFriendlyName = "PokerProbe Myrtille - $Hostname"
$cert = New-SelfSignedCertificate `
  -DnsName $Hostname `
  -CertStoreLocation "Cert:\LocalMachine\My" `
  -NotAfter (Get-Date).AddYears(2) `
  -FriendlyName $certFriendlyName `
  -KeyExportPolicy Exportable `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

Write-Step "Certificate thumbprint: $($cert.Thumbprint)"

Write-Step "Adding IIS HTTPS binding (SNI): $bindingInformation"
New-WebBinding -Name $SiteName -Protocol "https" -Port $Port -HostHeader $Hostname -SslFlags 1

$certItem = Get-Item "Cert:\LocalMachine\My\$($cert.Thumbprint)"
New-Item $sslBindingPath -Value $certItem | Out-Null

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
Write-Host "Verify locally (on this machine):"
Write-Host "  https://$Hostname/myrtille"
Write-Host ""
Write-Host "If you port-forward 8787 -> $Port, test externally:"
Write-Host "  https://${Hostname}:8787/myrtille"
Write-Host ""
Write-Host "Notes:"
Write-Host "  - Browsers still distrust self-signed certs unless you use Cloudflare proxy."
Write-Host "  - If Chrome shows HSTS block, clear at chrome://net-internals/#hsts (dev only)."
