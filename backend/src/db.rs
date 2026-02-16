pub mod tests;
pub mod models;
pub mod db;

use neo4j::{Auth, Graph, Session, Value, Driver};
use std::env;
use std::error::Error;

pub trait AIModel: Sync + Send {
    fn ask(&self, prompt: &str) -> Result<String, Box<dyn Error>>;
}

// Struct to hold vector embeddings
pub struct VectorRecord {
    id: String,
    embedding: Vec<f64>,
}

// Implement a default "no-op" AI Model
pub struct DefaultModel;

impl AIModel for DefaultModel {
    fn ask(&self, prompt: &str) -> Result<String, Box<dyn Error>> {
        Ok(format!("Default model response for: {}\n", prompt))
    }
}

// Function to dynamically select the AI Model at runtime
pub fn get_model(model_name: String) -> Box<dyn AIModel> {
    //In the future, this would dynamically set all parameters (token count, etc, but will hard code for now).
    match model_name.as_str() {
        "default" => Box::new(DefaultModel),
        // Add other models here
        _ => {
            println!("Unknown AI model, using default");
            Box::new(DefaultModel)
        }
    }
}

pub fn perform_qa(graph: Graph, qa_prompt: String, model: Box<dyn AIModel>) -> Result<String, Box<dyn Error>> {
    let mut session = graph.new_session(None).expect("failed to create a session!");
    // Ask from the AI Model
    let result = model.ask(&qa_prompt).expect("failed to make question!");

    Ok(result)
}

pub fn get_db() -> Result<Graph, Box<dyn Error>> {
    let uri = env::var("NEO4J_URI").unwrap_or_else(|_| "bolt://localhost:7687".to_string());
    let user = env::var("NEO4J_USER").unwrap_or_else(|_| "neo4j".to_string());
    let password = env::var("NEO4J_PASSWORD").unwrap_or_else(|_| "password".to_string());

    let auth = Auth::Basic { user, password };
    let driver = Driver::new(&uri, auth).map_err(|e| e.into())?;
    let graph = Graph::new(driver).map_err(|e| e.into())?;

    Ok(graph)
}
