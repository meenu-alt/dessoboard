import React from 'react';


const BreadCrumbs = ({ path, title }) => {
  return (
    <section className="as_breadcrum_wrapper"> 
      <div className="container">
        <div className="row">
          <div className="col-lg-12 text-center">
            <h1>{title}</h1>
            <ul className="breadcrumb"> 
              <li><a href="/">Home</a></li>
              <li>{path}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BreadCrumbs;