#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_service_creation() {
        let service = AIService::new("test_model".to_string());
        assert_eq!(service.model_name, "test_model");
    }

    #[test]
    fn test_ai_service_processing() {
        let service = AIService::new("test_model".to_string());
        let result = service.process_text("input_text");
        assert_eq!(result, "Processed text: input_text with model test_model");
    }

    #[test]
    fn test_add_function() {
        assert_eq!(add(2, 3), 5);
        assert_eq!(add(-1, 1), 0);
        assert_eq!(add(-1, -1), -2);
    }
}