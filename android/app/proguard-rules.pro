# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor reads these annotations via reflection (PluginHandle, Bridge.getPermissionStates).
# Without keeping the annotation types, R8 full mode assumes they are never instantiated
# and strips PluginHandle.pluginAnnotation, which crashes Plugin.checkPermissions.
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
