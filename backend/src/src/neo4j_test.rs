#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_neo4j_connection() {
        if env::var("NEO4J_URI").is_err() || env::var("NEO4J_USER").is_err() || env::var("NEO4J_PASSWORD").is_err() {
            println!("Skipping Neo4j connection test because environment variables are not set.");
            return;
        }

        match Neo4jConnection::new() {
            Ok(conn) => {
                match conn.execute_query("RETURN 1", None) {
                    Ok(result) => {
                        println!("Neo4j connection test successful!");
                        println!("Query result: {:?}", result);
                        assert!(true);
                    }
                    Err(e) => {
                        println!("Neo4j query test failed: {}", e);
                        assert!(false);
                    }
                }
            }
            Err(e) => {
                println!("Neo4j connection test failed: {}", e);
                assert!(false);
            }
        }
    }
}