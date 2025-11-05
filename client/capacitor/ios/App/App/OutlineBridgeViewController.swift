import UIKit
import Capacitor
import WebKit

class OutlineBridgeViewController: CAPBridgeViewController {
    
    override func loadView() {
        super.loadView()
        
        // Configure webView immediately after creation
        configureWebView()
    }
    
    private func configureWebView() {
        #if DEBUG
        if #available(iOS 16.4, *) {
            if let wkWebView = webView as? WKWebView {
                wkWebView.isInspectable = true
                NSLog("[OutlineApp] Web Inspector enabled in BridgeViewController")
            }
        }
        #endif
    }
}

