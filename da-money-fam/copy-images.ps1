# Copy artist images script
# Run this by right-clicking and selecting "Run with PowerShell"

$sourcePath = "C:\Users\Pharp\Desktop\DMF APPS\Site 2\Dmf site pics"
$destPath = "C:\Users\Pharp\Desktop\DMF APPS\Site 2\da-money-fam\public\images"

# Jackpot Pics
Copy-Item "$sourcePath\Jackpot Pics\IMG_1223.png" "$destPath\"
Copy-Item "$sourcePath\Jackpot Pics\IMG_1222.png" "$destPath\"
Copy-Item "$sourcePath\Jackpot Pics\Jackpotpic4.PNG" "$destPath\jackpot-extra-1.PNG"
Copy-Item "$sourcePath\Jackpot Pics\JacpotMagazine1.jpg" "$destPath\jackpot-magazine-1.jpg"
Copy-Item "$sourcePath\Jackpot Pics\JackpotMagazine2.jpg" "$destPath\jackpot-magazine-2.jpg"
Copy-Item "$sourcePath\Jackpot Pics\jackpotpic2.PNG" "$destPath\jackpot-extra-2.PNG"
Copy-Item "$sourcePath\Jackpot Pics\jackpotpic3.PNG" "$destPath\jackpot-extra-3.PNG"
Copy-Item "$sourcePath\Jackpot Pics\jackpotpic1.PNG" "$destPath\jackpot-extra-4.PNG"

# Vlone Tr3 Pics
Copy-Item "$sourcePath\Vlone Tr3 Pics\IMG_1220.png" "$destPath\vlonetr3-1.png"
Copy-Item "$sourcePath\Vlone Tr3 Pics\IMG_1219.png" "$destPath\vlonetr3-2.png"

# SideShowDaPlug Pics
Copy-Item "$sourcePath\SideShowDaPlug Pics\IMG_1228.png" "$destPath\sideshowdaplug-1.png"
Copy-Item "$sourcePath\SideShowDaPlug Pics\IMG_1229.png" "$destPath\sideshowdaplug-2.png"
Copy-Item "$sourcePath\SideShowDaPlug Pics\IMG_1221.png" "$destPath\sideshowdaplug-3.png"

Write-Host "All images copied successfully!"
