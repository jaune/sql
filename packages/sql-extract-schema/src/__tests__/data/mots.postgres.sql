CREATE TABLE lemmes (
  id INT,
  lemme VARCHAR(128),
  PRIMARY KEY (id)
);

CREATE TABLE flexions (
  id INT,
  lemme_id INT,
  flexion VARCHAR(128),
  frequency REAL,
  frequency_index INT,
  PRIMARY KEY (lemme_id, id)
);
