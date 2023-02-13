# AGREGAR INFO.PLIST
Esto e spara pedir la autorización de utilizar el gps y obtener la geolocalización
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>Se necesita permiso para acceder a tu ubicación</string>
<key>NSLocationAlwaysUsageDescription</key>
    <string>Se necesita permiso para acceder a tu ubicación</string>
<key>NSLocationWhenInUseUsageDescription</key>
    <string>Se necesita permiso para acceder a tu ubicación</string>
<key>NSCameraUsageDescription</key>
    <string>Se necesita permiso para acceder a tus fotos</string>
<key>NSPhotoLibraryAddUsageDescription</key>
    <string>Se necesita permiso para acceder a tus fotos</string>
<key>NSPhotoLibraryUsageDescription</key>
    <string>Se necesita permiso para acceder a tus fotos</string>



# AGREGAR A ANDROID MANIFEST XML
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

#Usuarios de prueba:
·Emergencia Regional
    User: maximo.emrdv
    Pass: Dfg.Cvb#47
·Reporte Emergencia Nacional
    User: maximo.emndv
    Pass: Wsx.Rty#81
·Reporte Emergencia Provincial
    User: maximo.empdv
    Pass: Rfv.Ujm#25​

# Compilar

- ios
ionic capacitor add ios
ionic capacitor sync ios
ionic capacitor build ios --release

- android
ionic capacitor add android
ionic capacitor sync android
ionic capacitor build android --release

# Splash & Icon
cordova-res android --skip-config --copy
cordova-res ios --skip-config --copy
