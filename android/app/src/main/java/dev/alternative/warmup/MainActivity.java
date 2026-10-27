package dev.alternative.warmup;

import android.os.Bundle;
import android.util.Log;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // The app is dark and draws under the system bars, so the status and
    // navigation icons have to be light. The theme attribute is not enough:
    // the bridge configures the window after the theme is applied, so this is
    // re-applied once the window actually has focus.
    private void useLightSystemBars() {
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
        Log.i("WarmupTheme", "applied light system bars");
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        useLightSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) useLightSystemBars();
    }
}
