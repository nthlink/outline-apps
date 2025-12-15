package org.outline.client;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import org.outline.CapacitorPluginOutline;

public class MainActivity extends BridgeActivity {
  private static final String TAG = "OutlineMainActivity";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    try {
      registerPlugin(CapacitorPluginOutline.class);
    } catch (Exception e) {
    }
    super.onCreate(savedInstanceState);
  }
}
