package ai.bodyhack.infinity;

import ai.bodyhack.infinity.pose.BodyhackPosePlugin;
import ai.bodyhack.infinity.voice.BodyhackVoicePlugin;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BodyhackPosePlugin.class);
        registerPlugin(BodyhackVoicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
