pub struct AIService {
    pub model_name: String,
}

impl AIService {
    pub fn new(model_name: String) -> Self {
        AIService { model_name }
    }

    pub fn process_text(&self, text: &str) -> String {
        format!("Processed text: {} with model {}", text, self.model_name)
    }
}

pub fn add(x: i32, y: i32) -> i32 {
    x + y
}