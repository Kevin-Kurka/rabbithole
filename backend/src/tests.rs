use super::*;
use neo4j::{Auth, Graph, Value, Driver};
use std::env;
use std::error::Error;


#[cfg(test)]
mod tests {
    use super::*;
    use tokio::runtime::Runtime;

    #[test]
    fn test_neo4j_connection() -> Result<(), Box<dyn Error>> {
        // Set up environment variables for testing
        env::set_var("NEO4J_URI", "bolt://localhost:7687");
        env::set_var("NEO4J_USER", "neo4j");
        env::set_var("NEO4J_PASSWORD", "password");

        // Attempt to connect to Neo4j
        let graph = db::get_db();

        match graph {
            Ok(_graph) => {
                // If connection is successful, assert that it is OK
               assert!(true);
            }
            Err(e) => {
                eprintln!("Failed to connect to Neo4j: {}", e);
                assert!(false, "Test failed due to connection error");
            }
        }
        Ok(())
    }


    #[test]
    fn test_perform_qa_default_model() -> Result<(), Box<dyn Error>> {
        // Set up test environment variables
        env::set_var("NEO4J_URI", "bolt://localhost:7687");
        env::set_var("NEO4J_USER", "neo4j");
        env::set_var("NEO4J_PASSWORD", "password");

        //Attempt to connect to the db
        let graph = get_db().expect("Failed to connect to the db!");

        // Test Values
        let model_name = "default".to_string();
        let qa_prompt: String = "Say hello to Neo4j".to_string();

        //Create the model and expect it not to explode
        let model = get_model(model_name);

		// Ask from the AI Model
		let result = db::perform_qa(graph, qa_prompt, model).expect("failed to perform query!");

        //Validate query is not blank
        assert!(result != "");

        Ok(())
    }

    #[test]
    fn test_get_model_default() -> Result<(), Box<dyn Error>> {
        let model = get_model("default".to_string());
        let qa_prompt = String::from("hello");
        let result = model.ask(&qa_prompt)?;

        assert_eq!(result, "Default model response for: hello\n");
        Ok(())
    }

    #[test]
    fn test_get_model_invalid() -> Result<(), Box<dyn Error>> {
        let model = get_model("Not A Model".to_string());
        let qa_prompt = String::from("hello");
        let result = model.ask(&qa_prompt)?;

        assert_eq!(result, "Default model response for: hello\n");
        Ok(())
    }

}