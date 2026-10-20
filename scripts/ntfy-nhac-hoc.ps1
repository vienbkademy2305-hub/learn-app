# Gui thong bao nhac hoc ve dien thoai qua ntfy.sh (cai app "ntfy", subscribe topic ben duoi).
param([string]$Topic = "hoc-ngoai-ngu-6faf99c7e0", [string]$Url = "")
$msg = "Den gio hoc ngoai ngu roi! Chi can hoc 5 phut de giu chuoi ngay hoc."
$h = @{ Title = "Nhac hoc moi ngay"; Tags = "fire"; Priority = "high" }
if ($Url) { $h.Click = $Url }
Invoke-RestMethod -Method Post -Uri "https://ntfy.sh/$Topic" -Headers $h -Body $msg | Out-Null
