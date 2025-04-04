fn main() {
    if let Ok(value) = std::env::var("MOCK_TIME") {
        if value == "true" {
            println!("cargo:rustc-cfg=feature=\"mock-time\"");
        }
    }

    println!("cargo:rerun-if-env-changed=MOCK_TIME");
    println!("cargo:rerun-if-feature-changed=mock-time");
}
