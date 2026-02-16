#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_ai_model_loading() {
        if env::var("AI_MODELS_DIR").is_err() {
            println!("Skipping AI model loading test because AI_MODELS_DIR is not set.");
            return;
        }
        match load_models() {
            Ok(models) => {
                println!("AI model loading test successful!");
                println!("Loaded {} AI models.", models.len());
                assert!(true);
            }
            Err(e) => {
                println!("AI model loading test failed: {}", e);
                assert!(false);
            }
        }
    }
}