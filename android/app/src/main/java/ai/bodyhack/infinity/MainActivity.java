package ai.bodyhack.infinity;

import ai.bodyhack.infinity.pose.BodyhackPosePlugin;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BodyhackPosePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
