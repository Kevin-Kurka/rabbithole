mod tests;
mod ai;
mod graphql;

use std::env;
use std::io;
use std::error::Error;

use actix_web::{
    web,
    App,
    HttpServer,
    HttpResponse,
};
use juniper::http::{playground::playground_source, GraphQLRequest};
use graphql::{create_schema, Context, Schema};

use rabbithole_backend::db::{get_db};

#[actix_web::main]
async fn main() -> Result<(), Box<dyn Error>> {
    println!("Running application");
    Ok(())
}