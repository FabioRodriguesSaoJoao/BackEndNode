import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pool from './db.js'; 

const app = express();
const port = 6543;

app.use(cors());
app.use(bodyParser.json());

// Endpoint de exemplo
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from server' });
});

app.get('/api/users', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users'); 
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });


  // Endpoint para salvar um novo usuário
app.post('/api/users', async (req, res) => {
    const { nome, email, senha } = req.body; 
  
    try {
      const result = await pool.query(
        'INSERT INTO users (nome, email, senha) VALUES ($1, $2, $3) RETURNING *',
        [nome, email, senha]
      );
      res.status(201).json(result.rows[0]); 
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Endpoint para login
  app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
  
      if (user && user.senha === senha) { 
        return res.json({ nome: user.nome }); 
      }
  
      return res.status(401).send('Usuário ou senha inválidos');
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // para adicionar produtos
  app.post('/api/produtos', async (req, res) => {
    const { nome, categoria, quantidade, preco, dta, fornecedor } = req.body;
  
    try {
      const result = await pool.query(
        'INSERT INTO produtos (nome, categoria, quantidade, preco, dta, fornecedor) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [nome, categoria, quantidade, preco, dta, fornecedor]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Erro ao adicionar produto', err);
      res.status(500).json({ error: 'Erro ao adicionar produto' });
    }
  });
    
  app.post('/api/entradas', async (req, res) => {
    const { produto_nome, quantidade, data_entrada, fornecedor, fatura } = req.body;
  
    try {
      // Verificar se o produto existe
      const productResult = await pool.query('SELECT * FROM produtos WHERE nome = $1', [produto_nome]);
      const product = productResult.rows[0];
  
      if (!product) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }
  
      // Atualizar a tabela de entradas
      const entryResult = await pool.query(
        'INSERT INTO entradas (produto_nome, quantidade, data_entrada, fornecedor, fatura) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [produto_nome, quantidade, data_entrada, fornecedor, fatura]
      );
  
      // Atualizar o estoque
      const updateStockResult = await pool.query(
        'UPDATE produtos SET quantidade = quantidade + $1 WHERE nome = $2 RETURNING *',
        [quantidade, produto_nome]
      );
  
      res.status(201).json({
        entry: entryResult.rows[0],
        updatedProduct: updateStockResult.rows[0],
      });
    } catch (err) {
      console.error('Erro ao registrar entrada de produto', err);
      res.status(500).json({ error: 'Erro ao registrar entrada de produto' });
    }
  });
  

  app.post('/api/saidas', async (req, res) => {
    const { produto_nome, quantidade, data_saida, recebedor, razao } = req.body;
  
    try {
      // Verificar a quantidade atual do produto
      const productResult = await pool.query('SELECT * FROM produtos WHERE nome = $1', [produto_nome]);
      const product = productResult.rows[0];
  
      if (!product) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }
  
      if (product.quantidade < quantidade) {
        return res.status(400).json({ message: 'Quantidade insuficiente em estoque' });
      }
  
      // Atualizar a tabela de saídas
      const exitResult = await pool.query(
        'INSERT INTO saidas (produto_nome, quantidade, data_saida, recebedor, razao) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [produto_nome, quantidade, data_saida, recebedor, razao]
      );
  
      // Atualizar o estoque
      const updateStockResult = await pool.query(
        'UPDATE produtos SET quantidade = quantidade - $1 WHERE nome = $2 RETURNING *',
        [quantidade, produto_nome]
      );
  
      res.status(201).json({
        exit: exitResult.rows[0],
        updatedProduct: updateStockResult.rows[0],
      });
    } catch (err) {
      console.error('Erro ao registrar saída de produto', err);
      res.status(500).json({ error: 'Erro ao registrar saída de produto' });
    }
  });
  
app.get('/api/estoque', async (req, res) => {
  const { nome, data_inicio, data_fim, fornecedor } = req.query;
  let query = 'SELECT * FROM produtos WHERE 1=1';
  let params = [];

  if (nome) {
    params.push(`%${nome}%`);
    query += ` AND nome ILIKE $${params.length}`;
  }
  if (data_inicio) {
    params.push(data_inicio);
    query += ` AND dta >= $${params.length}`;
  }
  if (data_fim) {
    params.push(data_fim);
    query += ` AND dta <= $${params.length}`;
  }
  if (fornecedor) {
    params.push(fornecedor);
    query += ` AND fornecedor = $${params.length}`;
  }

  try {
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erro ao obter estoque', err);
    res.status(500).json({ error: 'Erro ao obter estoque' });
  }
});

  app.get('api/estoque/movimentacao', async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    try {
      const entriesResult = await pool.query(
        'SELECT * FROM entradas WHERE data_entrada >= $1 AND data_entrada <= $2',
        [data_inicio, data_fim]
      );
      const exitsResult = await pool.query(
        'SELECT * FROM saidas WHERE data_saida >= $1 AND data_saida <= $2',
        [data_inicio, data_fim]
      );
  
      res.status(200).json({
        entries: entriesResult.rows,
        exits: exitsResult.rows,
      });
    } catch (err) {
      console.error('Erro ao obter movimentações de estoque', err);
      res.status(500).json({ error: 'Erro ao obter movimentações de estoque' });
    }
  });

  app.put('/api/estoque/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, categoria, quantidade, preco, fornecedor } = req.body;
  
    try {
      const updateQuery = `
        UPDATE produtos 
        SET nome = $1, categoria = $2, quantidade = $3, preco = $4, fornecedor = $5 
        WHERE id = $6
      `;
      await pool.query(updateQuery, [nome, categoria, quantidade, preco, fornecedor, id]);
      res.status(200).json({ message: 'Produto atualizado com sucesso' });
    } catch (err) {
      console.error('Erro ao atualizar produto', err);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  });
  app.delete('/api/estoque/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const deleteQuery = 'DELETE FROM produtos WHERE id = $1';
      await pool.query(deleteQuery, [id]);
      res.status(200).json({ message: 'Produto excluído com sucesso' });
    } catch (err) {
      console.error('Erro ao excluir produto', err);
      res.status(500).json({ error: 'Erro ao excluir produto' });
    }
  });
  app.put('/api/estoque/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, categoria, quantidade, preco, fornecedor } = req.body;
  
    try {
      const query = `
        UPDATE produtos 
        SET nome = $1, categoria = $2, quantidade = $3, preco = $4, fornecedor = $5 
        WHERE id = $6
      `;
      await pool.query(query, [nome, categoria, quantidade, preco, fornecedor, id]);
      res.status(200).json({ message: 'Produto atualizado com sucesso' });
    } catch (err) {
      console.error('Erro ao atualizar produto', err);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  });
    
  app.get('/api/historico', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 'entrada' AS tipo, produto_nome AS nome, quantidade AS quantidade, data_entrada AS data, fornecedor AS responsavel
        FROM entradas
        UNION ALL
        SELECT 'saida' AS tipo, produto_nome AS nome, quantidade AS quantidade, data_saida AS data, recebedor AS responsavel
        FROM saidas
        ORDER BY data DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Erro ao obter histórico de estoque', err);
      res.status(500).json({ error: 'Erro ao obter histórico de estoque' });
    }
  });

  app.get('/api/pedidos', async (req, res) => {
    try {
      const pedidos = await pool.query('SELECT * FROM pedidos');
      res.json(pedidos.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  });
  
  app.get('/api/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const order = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
      const items = await pool.query('SELECT * FROM itens_pedido WHERE pedido_id = $1', [id]);
      res.json({ ...order.rows[0], items: items.rows });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  });

  app.delete('/api/pedidos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deletePedido = await pool.query('DELETE FROM pedidos WHERE id = $1', [id]);
      if (deletePedido.rowCount === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      res.json({ message: 'Pedido excluído com sucesso' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  });
  app.post('/api/pedidos', async (req, res) => {
    const { cliente, endereco, items } = req.body;
  
    try {
      const newOrder = await pool.query(
        'INSERT INTO pedidos (cliente, endereco) VALUES ($1, $2) RETURNING *',
        [cliente, endereco]
      );
      const pedido_id = newOrder.rows[0].id;
      const itemQueries = items.map((item) =>
        pool.query(
          'INSERT INTO itens_pedido (pedido_id, nome_produto, quantidade, preco) VALUES ($1, $2, $3, $4)',
          [pedido_id, item.nome_produto, item.quantidade, item.preco]
        )
      );
  
      await Promise.all(itemQueries);
  
      res.json({ message: 'Pedido cadastrado com sucesso!' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  });
  

  app.put('/api/pedidos/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await pool.query('UPDATE pedidos SET status = $1 WHERE id = $2', [status, id]);
      res.json({ message: 'Status do pedido atualizado com sucesso!' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  });

app.get('/api/vendas/mais-vendidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vendas.id_produto, produtos.nome, SUM(vendas.quantidade) as sold
      FROM vendas
      JOIN produtos ON vendas.id_produto = produtos.id
      GROUP BY vendas.id_produto, produtos.nome
      ORDER BY sold DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter produtos mais vendidos', error);
    res.status(500).send('Erro ao obter produtos mais vendidos');
  }
});

app.get('/api/vendas/menos-vendidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vendas.id_produto, produtos.nome, SUM(vendas.quantidade) as sold
      FROM vendas
      JOIN produtos ON vendas.id_produto = produtos.id
      GROUP BY vendas.id_produto, produtos.nome
      ORDER BY sold ASC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter produtos menos vendidos', error);
    res.status(500).send('Erro ao obter produtos menos vendidos');
  }
});

app.get('/api/vendas/tendencias', async (req, res) => {
  try {
    const dailyResult = await pool.query(`
      SELECT dta AS date, SUM(quantidade) AS sales
      FROM vendas
      GROUP BY dta
      ORDER BY dta
    `);
    
    const weeklyResult = await pool.query(`
      SELECT date_trunc('week', dta) AS week, SUM(quantidade) AS sales
      FROM vendas
      GROUP BY week
      ORDER BY week
    `);
    
    const monthlyResult = await pool.query(`
      SELECT date_trunc('month', dta) AS month, SUM(quantidade) AS sales
      FROM vendas
      GROUP BY month
      ORDER BY month
    `);

    res.json({
      daily: dailyResult.rows,
      weekly: weeklyResult.rows,
      monthly: monthlyResult.rows
    });
  } catch (error) {
    console.error('Erro ao obter tendências de vendas', error);
    res.status(500).send('Erro ao obter tendências de vendas');
  }
});

app.get('/api/vendas/relatorios-financeiros', async (req, res) => {
  try {
      const result = await pool.query(`
          SELECT dta, SUM(total_vendido) as totalvendas
          FROM vendas
          GROUP BY dta
          ORDER BY dta
      `);
      res.json(result.rows);
  } catch (error) {
      console.error('Erro ao obter relatórios financeiros', error);
      res.status(500).send('Erro ao obter relatórios financeiros');
  }
});

app.get('/candidatos', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM candidatos');
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao obter candidatos', error);
      res.status(500).send('Erro ao obter candidatos');
    }
  });
  
  app.put('/candidatos/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await pool.query('UPDATE candidatos SET status = $1 WHERE id = $2', [status, id]);
      res.send('Status atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar status do candidato', error);
      res.status(500).send('Erro ao atualizar status do candidato');
    }
  });
  
  app.put('/candidatos/:id/ativo', async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;
    try {
      await pool.query('UPDATE candidatos SET ativo = $1 WHERE id = $2', [ativo, id]);
      res.send('Status de atividade atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar status de atividade do candidato', error);
      res.status(500).send('Erro ao atualizar status de atividade do candidato');
    }
  });

let candidatos = []; 

app.post('/api/rh/candidatos', (req, res) => {
  const { nome, funcao, status } = req.body;
  const novoCandidato = { id: candidatos.length + 1, nome, funcao, status, ativo: true };
  candidatos.push(novoCandidato);
  res.status(201).send(novoCandidato);
});

app.get('/api/rh/candidatos', (req, res) => {
  res.send(candidatos);
});

app.put('/api/rh/candidatos/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const candidato = candidatos.find((c) => c.id === parseInt(id));
  if (candidato) {
    candidato.status = status;
    res.send(candidato);
  } else {
    res.status(404).send('Candidato não encontrado');
  }
});
app.put('/api/rh/candidatos/:id/analise_curriculo', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  
  try {
    await pool.query('UPDATE candidatos SET analise_curriculo = $1 WHERE id = $2', [status, id]);
    res.send('Análise do Currículo atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar Análise do Currículo', error);
    res.status(500).send('Erro ao atualizar Análise do Currículo');
  }
});

app.put('/api/rh/candidatos/:id/entrevista_rh', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  
  try {
    await pool.query('UPDATE candidatos SET entrevista_rh = $1 WHERE id = $2', [status, id]);
    res.send('Entrevista com RH atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar Entrevista com RH', error);
    res.status(500).send('Erro ao atualizar Entrevista com RH');
  }
});
app.put('/api/rh/candidatos/:id/entrevista_tecnica', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  
  try {
    await pool.query('UPDATE candidatos SET entrevista_tecnica = $1 WHERE id = $2', [status, id]);
    res.send('Entrevista Técnica atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar Entrevista Técnica', error);
    res.status(500).send('Erro ao atualizar Entrevista Técnica');
  }
});
app.put('/api/rh/candidatos/:id/entrevista_tecnica', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  
  try {
    await pool.query('UPDATE candidatos SET entrevista_tecnica = $1 WHERE id = $2', [status, id]);
    res.send('Entrevista Técnica atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar Entrevista Técnica', error);
    res.status(500).send('Erro ao atualizar Entrevista Técnica');
  }
});
app.put('/api/rh/candidatos/:id/contratacao_concluida', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  
  try {
    await pool.query('UPDATE candidatos SET contratacao_concluida = $1 WHERE id = $2', [status, id]);
    res.send('Contratação Concluída atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar Contratação Concluída', error);
    res.status(500).send('Erro ao atualizar Contratação Concluída');
  }
});

app.put('/api/rh/candidatos/:id/ativo', (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;
  const candidato = candidatos.find((c) => c.id === parseInt(id));
  if (candidato) {
    candidato.ativo = ativo;
    res.send(candidato);
  } else {
    res.status(404).send('Candidato não encontrado');
  }
});
app.put('/candidatos/:id/passos/:step', async (req, res) => {
  const { id, step } = req.params;
  const { status } = req.body;
  const dateField = `${step}_date`;
  try {
    await db.query(`UPDATE candidatos SET ${step} = $1, ${dateField} = $2 WHERE id = $3`, [status, new Date(), id]);
    res.status(200).json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});
app.put('/api/rh/candidatos/:candidateId/steps/:step', async (req, res) => {
  const { candidateId, step } = req.params;
  const { status, date } = req.body;

  try {
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).send('Candidato não encontrado');
    }

    candidate[`${step}_status`] = status;
    candidate[`${step}_date`] = date;
    await candidate.save();

    res.send(candidate);
  } catch (error) {
    res.status(500).send('Erro ao atualizar status e data do candidato');
  }
});
app.post('/api/adcProcessos', async (req, res) => {
  const { processName, tableName, columns } = req.body;

  const createTableQuery = `
    CREATE TABLE ${tableName} (
      id SERIAL PRIMARY KEY,
      ${columns.map(col => `${col} TEXT`).join(',\n')}
    );
  `;

  const insertProcessQuery = `
    INSERT INTO processos (nome, tabela, colunas)
    VALUES ($1, $2, $3)
  `;

  try {
    await pool.query(createTableQuery);
    await pool.query(insertProcessQuery, [processName, tableName, columns]);
    res.status(200).send('Processo criado com sucesso');
  } catch (error) {
    console.error('Erro ao criar nova tabela', error);
    res.status(500).send('Erro ao criar novo processo');
  }
});

app.get('/api/processes', async (req, res) => {
  try {
    const result = await pool.query('SELECT nome AS title, tabela AS path FROM processos');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar processos', error);
    res.status(500).send('Erro ao buscar processos');
  }
});
  
app.delete('/api/processos/:titulo', async (req, res) => {
  const titulo = req.params.titulo;
  
  try {
    const sanitizedTitle = titulo.replace(/[^a-zA-Z0-9_]/g, '');
    await pool.query(`DROP TABLE IF EXISTS ${sanitizedTitle}`);
    await pool.query('DELETE FROM processos WHERE tabela = $1', [sanitizedTitle]);
    res.status(200).send('Processo excluído com sucesso');
  } catch (error) {
    console.error('Erro ao excluir processo', error);
    res.status(500).send('Erro ao excluir processo');
  }
});

app.get('/api/:processosNome', async (req, res) => {
  const { processosNome } = req.params;
  const formattedTableName = processosNome.replace(/ /g, '_');

  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
    `, [formattedTableName]);

    const columns = result.rows.map(row => row.column_name);
    res.status(200).json({ columns });
  } catch (error) {
    console.error('Erro ao buscar colunas da tabela', error);
    res.status(500).send('Erro ao buscar colunas da tabela');
  }
});

  app.post('/api/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const data = req.body;
  
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  
    try {
      const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
      await pool.query(query, values);
      res.status(200).send('Dados inseridos com sucesso');
    } catch (error) {
      console.error('Erro ao inserir dados', error);
      res.status(500).send('Erro ao inserir dados');
    }
  });
  app.get('/api/:tableName', async (req, res) => {
    const { tableName } = req.params;

  console.log(tableName)
    try {
      const result = await pool.query(`SELECT * FROM ${tableName}`);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar dados', error);
      res.status(500).send('Erro ao buscar dados');
    }
  });

  app.get('/api/:tableName/data', async (req, res) => {
    const { tableName } = req.params;
  
    try {
      const result = await pool.query(`SELECT * FROM ${tableName}`);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar dados', error);
      res.status(500).send('Erro ao buscar dados');
    }
  });
  
  
  

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
